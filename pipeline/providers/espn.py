"""Provedor principal: API pública (não oficial) da ESPN.

Um único endpoint é usado: `/scoreboard?dates=YYYYMMDD`, que traz todos os jogos
do dia com placar, gols com minuto, cartões e estatísticas, além do calendário
completo da temporada (`leagues[0].calendar`). As datas seguem o fuso de Nova York.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError

from pipeline.config import ESPN_BASE, ESPN_PAUSE_S, LOCAL_CACHE
from pipeline.http import PoliteClient
from pipeline.models import (
    GoalEvent,
    Match,
    MatchDetails,
    MatchStatus,
    SeasonData,
    Team,
    TeamStats,
    match_id,
)
from pipeline.providers.base import ProviderError

ESPN_TZ = ZoneInfo("America/New_York")


# --- Formato cru (só os campos usados; o resto é ignorado) -------------------


class _Raw(BaseModel):
    model_config = ConfigDict(extra="ignore")


class RawStatusType(_Raw):
    name: str
    state: str
    completed: bool


class RawStatus(_Raw):
    type: RawStatusType


class RawRef(_Raw):
    id: str


class RawTeam(_Raw):
    id: str
    displayName: str


class RawStat(_Raw):
    name: str
    displayValue: str | None = None


class RawCompetitor(_Raw):
    homeAway: str
    score: str | None = None
    team: RawTeam
    statistics: list[RawStat] = []


class RawClock(_Raw):
    displayValue: str = ""


class RawDetail(_Raw):
    clock: RawClock = RawClock()
    athletesInvolved: list[RawRef] = []
    team: RawRef | None = None
    scoringPlay: bool = False
    ownGoal: bool = False
    penaltyKick: bool = False
    shootout: bool = False
    yellowCard: bool = False
    redCard: bool = False


class RawAddress(_Raw):
    city: str | None = None


class RawVenue(_Raw):
    fullName: str | None = None
    address: RawAddress | None = None


class RawCompetition(_Raw):
    date: str
    status: RawStatus
    competitors: list[RawCompetitor]
    details: list[RawDetail] = []
    venue: RawVenue | None = None


class RawEvent(_Raw):
    id: str
    date: str
    competitions: list[RawCompetition]


class RawLeague(_Raw):
    calendar: list[str] = []


class RawScoreboard(_Raw):
    leagues: list[RawLeague]
    events: list[RawEvent]


# --- Conversões ----------------------------------------------------------------


def espn_date_key(kickoff_utc: str) -> str:
    """Data (YYYYMMDD) em que a ESPN lista o jogo (fuso de Nova York)."""
    dt = datetime.fromisoformat(kickoff_utc.replace("Z", "+00:00"))
    return dt.astimezone(ESPN_TZ).strftime("%Y%m%d")


def calendar_keys(calendar: list[str]) -> list[str]:
    return sorted({c[:10].replace("-", "") for c in calendar})


def map_status(st: RawStatusType) -> MatchStatus:
    name = st.name.upper()
    if "POSTPONED" in name or "SUSPENDED" in name or "DELAYED" in name:
        return "postponed"
    if "CANCEL" in name or "ABANDON" in name or "FORFEIT" in name:
        return "cancelled"
    if st.completed or st.state == "post":
        return "finished"
    if st.state == "in":
        return "live"
    return "scheduled"


_CLOCK = re.compile(r"^(\d+)'(?:\+(\d+)')?")


def parse_clock(display: str) -> tuple[int, int | None] | None:
    m = _CLOCK.match(display.strip())
    if not m:
        return None
    return int(m.group(1)), (int(m.group(2)) if m.group(2) else None)


def _num(stats: list[RawStat], name: str) -> float | None:
    for s in stats:
        if s.name == name and s.displayValue not in (None, ""):
            try:
                return float(s.displayValue)
            except ValueError:
                return None
    return None


def _int(stats: list[RawStat], name: str) -> int | None:
    v = _num(stats, name)
    return int(v) if v is not None else None


class LocalCacheClient:
    """Lê as respostas cruas salvas em .cache/ (modo --offline, zero chamadas)."""

    calls = 0

    def get_json(self, path: str, dates: str) -> dict:
        f = LOCAL_CACHE / f"espn-{dates}.json"
        if not f.exists():
            raise httpx.HTTPError(f"sem cache local para {dates}")
        return json.loads(f.read_text(encoding="utf-8"))


class EspnProvider:
    name = "espn"

    def __init__(self, teams: list[Team], rounds: dict[str, int], client: PoliteClient | None = None):
        self.by_espn_id = {t.aliases.espn: t.id for t in teams if t.aliases.espn}
        self.rounds = rounds
        self.client = client or PoliteClient(ESPN_BASE, pause_s=ESPN_PAUSE_S)
        self.calendar: list[str] = []

    @property
    def calls(self) -> int:
        return self.client.calls

    # -- rede -------------------------------------------------------------------

    def scoreboard(self, date_key: str) -> RawScoreboard:
        try:
            raw = self.client.get_json("/scoreboard", dates=date_key)
        except (httpx.HTTPError, json.JSONDecodeError) as exc:
            raise ProviderError(f"ESPN /scoreboard?dates={date_key}: {exc!r}") from exc
        LOCAL_CACHE.mkdir(exist_ok=True)
        (LOCAL_CACHE / f"espn-{date_key}.json").write_text(json.dumps(raw), encoding="utf-8")
        try:
            sb = RawScoreboard.model_validate(raw)
        except ValidationError as exc:
            raise ProviderError(f"ESPN mudou o formato (dates={date_key}): {exc}") from exc
        if sb.leagues and sb.leagues[0].calendar:
            self.calendar = calendar_keys(sb.leagues[0].calendar)
        return sb

    def fetch(self, dates: list[str] | None) -> SeasonData:
        """Busca as datas pedidas. Com `dates=None`, busca a temporada inteira
        (1 chamada para descobrir o calendário + 1 por data com jogo)."""
        matches: dict[str, Match] = {}
        details: dict[str, MatchDetails] = {}
        if dates is None:
            today = datetime.now(ESPN_TZ).strftime("%Y%m%d")
            self._collect(self.scoreboard(today), matches, details)
            dates = [d for d in self.calendar if d != today]
        for d in dates:
            self._collect(self.scoreboard(d), matches, details)
        return SeasonData(provider="espn", matches=list(matches.values()), details=details)

    # -- normalização -------------------------------------------------------------

    def _collect(self, sb: RawScoreboard, matches: dict, details: dict) -> None:
        for ev in sb.events:
            parsed = self.parse_event(ev)
            if parsed is None:
                continue
            m, det = parsed
            matches[m.id] = m
            if det is not None:
                details[m.id] = det

    def parse_event(self, ev: RawEvent) -> tuple[Match, MatchDetails | None] | None:
        comp = ev.competitions[0]
        sides = {c.homeAway: c for c in comp.competitors}
        if set(sides) != {"home", "away"}:
            raise ProviderError(f"ESPN evento {ev.id}: sem mandante/visitante")
        home_raw, away_raw = sides["home"], sides["away"]
        if home_raw.team.displayName.startswith("TBD") or away_raw.team.displayName.startswith("TBD"):
            return None  # jogos de playoff ainda sem adversário definido
        try:
            home, away = self.by_espn_id[home_raw.team.id], self.by_espn_id[away_raw.team.id]
        except KeyError as exc:
            raise ProviderError(f"ESPN evento {ev.id}: time desconhecido {exc}") from exc
        mid = match_id(home, away)
        if mid not in self.rounds:
            return None  # não é jogo da fase de pontos corridos (ex.: playoff)
        status = map_status(comp.status.type)
        finished = status == "finished"
        hg = int(home_raw.score) if finished and home_raw.score is not None else None
        ag = int(away_raw.score) if finished and away_raw.score is not None else None

        det = None
        ht = (None, None)
        if finished:
            det, ht = self._details(mid, comp, home, away, hg or 0, ag or 0)

        venue = comp.venue
        match = Match(
            id=mid,
            round=self.rounds[mid],
            kickoff_utc=comp.date,
            status=status,
            home_id=home,
            away_id=away,
            home_goals=hg,
            away_goals=ag,
            ht_home_goals=ht[0],
            ht_away_goals=ht[1],
            venue=venue.fullName if venue else None,
            city=venue.address.city if venue and venue.address else None,
            source="espn",
        )
        return match, det

    def _details(self, mid, comp, home, away, hg, ag):
        goals: list[tuple[GoalEvent, str | None]] = []  # (gol, id do autor)
        cards = {home: [0, 0], away: [0, 0]}  # [amarelos, vermelhos]
        for d in comp.details:
            team = self.by_espn_id.get(d.team.id) if d.team else None
            if d.yellowCard and team in cards:
                cards[team][0] += 1
            if d.redCard and team in cards:
                cards[team][1] += 1
            if not d.scoringPlay or d.shootout or team is None:
                continue
            clock = parse_clock(d.clock.displayValue)
            if clock is None:
                continue
            minute, extra = clock
            goals.append(
                (
                    GoalEvent(
                        team_id=team,
                        minute=min(minute, 90),
                        extra=extra,
                        period=1 if minute <= 45 else 2,
                        own_goal=d.ownGoal,
                        penalty=d.penaltyKick,
                    ),
                    d.athletesInvolved[0].id if d.athletesInvolved else None,
                )
            )
        goals = dedupe_goals(goals, {home: hg, away: ag})
        goals = fix_own_goals(goals, home, away, hg, ag)
        complete = goals is not None
        goals = goals or []
        ht = (
            (
                sum(1 for g in goals if g.period == 1 and g.team_id == home),
                sum(1 for g in goals if g.period == 1 and g.team_id == away),
            )
            if complete
            else (None, None)
        )
        stats = {}
        for side, tid in (("home", home), ("away", away)):
            c = next(x for x in comp.competitors if x.homeAway == side)
            stats[tid] = TeamStats(
                possession=_num(c.statistics, "possessionPct"),
                shots=_int(c.statistics, "totalShots"),
                shots_on_target=_int(c.statistics, "shotsOnTarget"),
                corners=_int(c.statistics, "wonCorners"),
                yellow=cards[tid][0],
                red=cards[tid][1],
            )
        return MatchDetails(match_id=mid, goals=goals, goals_complete=complete, stats=stats), ht


def dedupe_goals(goals: list[tuple[GoalEvent, str | None]], score: dict[str, int]) -> list[GoalEvent]:
    """A ESPN às vezes lista o mesmo gol duas vezes (mesmo autor, 0 a 2 min de
    diferença). Só remove duplicatas de um time quando ele tem mais gols listados
    do que no placar, sempre o par mais próximo do mesmo autor primeiro."""
    goals = list(goals)
    for team, n in score.items():
        while sum(g.team_id == team for g, _ in goals) > n:
            best = None
            for i, (gi, ai) in enumerate(goals):
                for j in range(i + 1, len(goals)):
                    gj, aj = goals[j]
                    if gi.team_id != team or gj.team_id != team or ai is None or ai != aj:
                        continue
                    gap = abs((gi.minute + (gi.extra or 0)) - (gj.minute + (gj.extra or 0)))
                    if gap <= 2 and (best is None or gap < best[0]):
                        best = (gap, j)
            if best is None:
                break
            goals.pop(best[1])
    return [g for g, _ in goals]


def fix_own_goals(goals: list[GoalEvent], home: str, away: str, hg: int, ag: int) -> list[GoalEvent] | None:
    """Garante que os gols somem o placar. A ESPN pode atribuir o gol contra ao
    time do jogador; se inverter os gols contra fizer a conta bater, inverte.
    Devolve None se não houver como fechar a conta (lista incompleta)."""

    def count(gs):
        return sum(g.team_id == home for g in gs), sum(g.team_id == away for g in gs)

    if count(goals) == (hg, ag):
        return goals
    flipped = [
        g.model_copy(update={"team_id": away if g.team_id == home else home}) if g.own_goal else g
        for g in goals
    ]
    if count(flipped) == (hg, ag):
        return flipped
    return None

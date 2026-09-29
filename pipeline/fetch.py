"""Busca de dados com cache, consulta mínima e fallback de provedor.

Regras (gentileza com a ESPN):
- Só consulta quando algum jogo da Série B já deveria ter terminado desde a última
  atualização, decidido pelos horários em cache (nenhuma chamada para decidir).
- Consulta apenas as datas desses jogos (+ datas novas do calendário, se houver remarcação).
- Se a ESPN falhar (rede, HTTP ou validação), usa a footballsoccerapi para os placares
  e mantém os detalhes já em cache. O contador de falhas seguidas fica em
  data/raw/state.json; o workflow abre uma issue quando ele chega a 2.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from pipeline.config import (
    DATA,
    ESPN_ISSUE_AFTER_FAILURES,
    MATCH_DONE_AFTER,
    N_TEAMS,
    RAW,
    STALE_MATCH_AFTER,
    STALE_RECHECK_EVERY,
    TOTAL_ROUNDS,
)
from pipeline.models import FetchState, Match, MatchDetails, SeasonData, Team
from pipeline.providers.base import ProviderError
from pipeline.providers.espn import EspnProvider, espn_date_key

STATE_FILE = RAW / "state.json"
MATCHES_FILE = DATA / "matches.json"
DETAILS_FILE = DATA / "details.json"
UPCOMING_WINDOW = timedelta(days=3)  # reconfere horários dos jogos dos próximos dias
DELAY_GRACE = timedelta(hours=2)  # folga antes de avisar no site que um resultado está atrasado


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


# --- Cache ----------------------------------------------------------------------


def load_state() -> FetchState:
    if STATE_FILE.exists():
        return FetchState.model_validate_json(STATE_FILE.read_text(encoding="utf-8"))
    return FetchState()


def load_cached() -> SeasonData | None:
    if not MATCHES_FILE.exists():
        return None
    matches = [Match.model_validate(m) for m in json.loads(MATCHES_FILE.read_text(encoding="utf-8"))]
    details = {}
    if DETAILS_FILE.exists():
        raw = json.loads(DETAILS_FILE.read_text(encoding="utf-8"))
        details = {k: MatchDetails.model_validate(v) for k, v in raw.items()}
    provider = "espn" if any(m.source == "espn" for m in matches) else "footballsoccerapi"
    return SeasonData(provider=provider, matches=matches, details=details)


# --- Decisão: consultar ou não ------------------------------------------------------


def due_matches(matches: list[Match], state: FetchState, now: datetime) -> list[Match]:
    """Jogos que já deveriam ter terminado e ainda não estão como encerrados."""
    due = []
    for m in matches:
        if m.status not in ("scheduled", "live"):
            continue
        ko = parse_dt(m.kickoff_utc)
        if ko + MATCH_DONE_AFTER > now:
            continue
        if now - ko > STALE_MATCH_AFTER:
            last = state.date_checked_at.get(espn_date_key(m.kickoff_utc))
            if last and now - parse_dt(last) < STALE_RECHECK_EVERY:
                continue
        due.append(m)
    return due


def plan_dates(cached: SeasonData | None, state: FetchState, now: datetime, force: bool = False) -> list[str] | None:
    """Datas a consultar na ESPN. None = carga completa; [] = nada a fazer."""
    if cached is None or not cached.matches:
        return None
    due = due_matches(cached.matches, state, now)
    # jogos encerrados que vieram do reserva: buscar os detalhes na ESPN
    backfill = [m for m in cached.matches if m.status == "finished" and m.source != "espn"]
    if not due and not backfill and not force:
        return []
    dates = {espn_date_key(m.kickoff_utc) for m in due + backfill}
    # aproveita a ida para reconferir horários dos próximos dias
    for m in cached.matches:
        ko = parse_dt(m.kickoff_utc)
        if m.status == "scheduled" and now <= ko <= now + UPCOMING_WINDOW:
            dates.add(espn_date_key(m.kickoff_utc))
    return sorted(dates)


# --- Mescla e validação -----------------------------------------------------------


def merge(cached: SeasonData | None, fresh: SeasonData) -> SeasonData:
    matches = {m.id: m for m in (cached.matches if cached else [])}
    details = dict(cached.details) if cached else {}
    for m in fresh.matches:
        old = matches.get(m.id)
        # o reserva nunca sobrescreve um jogo já encerrado vindo da ESPN
        if old and old.status == "finished" and old.source == "espn" and m.source != "espn":
            continue
        matches[m.id] = m
    details.update(fresh.details)
    ordered = sorted(matches.values(), key=lambda m: (m.round, m.kickoff_utc, m.id))
    return SeasonData(provider=fresh.provider, matches=ordered, details=details)


def validate_season(season: SeasonData, teams: list[Team]) -> None:
    n_expected = N_TEAMS * (N_TEAMS - 1)
    if len(season.matches) != n_expected:
        raise ProviderError(f"{len(season.matches)} jogos na temporada (esperado {n_expected})")
    ids = {t.id for t in teams}
    per_team = {t: 0 for t in ids}
    for m in season.matches:
        per_team[m.home_id] += 1
        per_team[m.away_id] += 1
        if m.status == "finished" and (m.home_goals is None or m.away_goals is None):
            raise ProviderError(f"Jogo encerrado sem placar: {m.id}")
    bad = {t: n for t, n in per_team.items() if n != TOTAL_ROUNDS}
    if bad:
        raise ProviderError(f"Times com número errado de jogos: {bad}")


# --- Execução ---------------------------------------------------------------------


@dataclass
class FetchResult:
    season: SeasonData | None  # None = nada a fazer
    state: FetchState
    provider_used: str | None = None
    espn_error: str | None = None
    calls: dict[str, int] = field(default_factory=dict)
    due: int = 0


def run_fetch(
    teams: list[Team],
    rounds: dict[str, int],
    now: datetime | None = None,
    force: bool = False,
    espn: EspnProvider | None = None,
    fallback_factory=None,
) -> FetchResult:
    now = now or datetime.now(timezone.utc)
    state = load_state()
    cached = load_cached()
    dates = plan_dates(cached, state, now, force)
    result = FetchResult(season=None, state=state)
    if dates == []:
        return result
    result.due = len(due_matches(cached.matches, state, now)) if cached else 0

    espn = espn or EspnProvider(teams, rounds)
    try:
        fresh = espn.fetch(dates)
        season = merge(cached, fresh)
        # remarcações: datas novas no calendário, ou jogo que sumiu da data consultada
        known = set(state.calendar)
        fetched = set(dates or []) | ({*espn.calendar} if dates is None else set())
        extra = {d for d in espn.calendar if d not in known and d not in fetched} if known else set()
        if cached and dates:
            fresh_ids = {m.id for m in fresh.matches}
            vanished = [m for m in cached.matches
                        if espn_date_key(m.kickoff_utc) in dates and m.id not in fresh_ids
                        and m.status != "finished"]
            if vanished:
                today = now.strftime("%Y%m%d")
                extra |= {d for d in espn.calendar if d >= today and d not in fetched}
        if extra:
            season = merge(season, espn.fetch(sorted(extra)))
            fetched |= extra
        validate_season(season, teams)
        state.espn_consecutive_failures = 0
        state.espn_last_error = None
        state.espn_last_success_at = iso(now)
        if espn.calendar:
            state.calendar = espn.calendar
        for d in fetched:
            state.date_checked_at[d] = iso(now)
        result.provider_used = "espn"
    except (ProviderError, ValueError) as exc:
        state.espn_consecutive_failures += 1
        state.espn_last_error = f"{iso(now)} {type(exc).__name__}: {exc}"[:2000]
        result.espn_error = state.espn_last_error
        print(f"ESPN falhou ({state.espn_consecutive_failures}x seguidas): {exc}")
        season = None
    finally:
        result.calls["espn"] = espn.calls

    if season is None:
        try:
            if fallback_factory is None:
                from pipeline.providers.footballsoccerapi import FootballSoccerApiProvider

                fb = FootballSoccerApiProvider(teams, rounds)
            else:
                fb = fallback_factory()
            fresh = fb.fetch(None)
            result.calls["footballsoccerapi"] = fb.calls
            season = merge(cached, fresh)
            validate_season(season, teams)
            result.provider_used = "footballsoccerapi"
        except (ProviderError, ValueError) as exc:
            state.espn_last_error = (state.espn_last_error or "") + f"\nReserva também falhou: {exc}"
            result.state = state
            save_state(state)
            raise ProviderError(f"Nenhum provedor disponível. ESPN: {result.espn_error} | Reserva: {exc}") from exc

    state.last_provider = result.provider_used  # type: ignore[assignment]
    state.last_success_at = iso(now)
    result.season = season
    result.state = state
    return result


def data_status(matches: list[Match], state: FetchState, now: datetime) -> dict:
    """Dados atrasados = a ESPN falhou seguidamente e ainda há jogo que já deveria ter terminado sem resultado
    (se o reserva trouxe tudo, não há atraso)."""
    pending = any(
        m.status in ("scheduled", "live") and parse_dt(m.kickoff_utc) + MATCH_DONE_AFTER + DELAY_GRACE <= now
        for m in matches
    )
    return {
        "delayed": state.espn_consecutive_failures >= ESPN_ISSUE_AFTER_FAILURES and pending,
        "lastSuccessAt": state.last_success_at or state.espn_last_success_at,
    }


def save_state(state: FetchState) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = state.dump()
    data["dateCheckedAt"] = dict(sorted(data["dateCheckedAt"].items()))
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")

"""Utilitários compartilhados pelos cálculos."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from pipeline.config import TIMEZONE
from pipeline.models import Match

TZ = ZoneInfo(TIMEZONE)


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def finished(matches: list[Match]) -> list[Match]:
    return sorted(
        (m for m in matches if m.status == "finished" and m.home_goals is not None),
        key=lambda m: (m.kickoff_utc, m.id),
    )


def team_matches(matches: list[Match], team: str) -> list[Match]:
    return [m for m in matches if team in (m.home_id, m.away_id)]


def goals(m: Match, team: str) -> tuple[int, int]:
    """(gols pró, gols contra) do ponto de vista de `team`."""
    if m.home_id == team:
        return m.home_goals, m.away_goals
    return m.away_goals, m.home_goals


def result(m: Match, team: str) -> str:
    gf, ga = goals(m, team)
    return "V" if gf > ga else "E" if gf == ga else "D"


def opponent(m: Match, team: str) -> str:
    return m.away_id if m.home_id == team else m.home_id


def form(matches: list[Match], team: str, n: int = 5) -> list[str]:
    done = team_matches(finished(matches), team)
    return [result(m, team) for m in done[-n:]]


def plural(n: int, singular: str, plural_: str | None = None) -> str:
    return f"{n} {singular if n == 1 else (plural_ or singular + 's')}"


def local_date(iso_utc: str) -> str:
    """'27/09' no fuso de Fortaleza."""
    return parse_dt(iso_utc).astimezone(TZ).strftime("%d/%m")

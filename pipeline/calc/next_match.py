"""Próximo jogo do Fortaleza (card do topo, F1)."""

from __future__ import annotations

from collections import Counter

from pipeline.calc.common import form
from pipeline.models import Match
from pipeline.outputs import NextMatch


def usual_venue(matches: list[Match], home_id: str) -> tuple[str | None, str | None]:
    """Estádio (e cidade) mais usado pelo mandante na temporada: a ESPN só informa o estádio perto do jogo."""
    seen = Counter((m.venue, m.city) for m in matches if m.home_id == home_id and m.venue)
    return seen.most_common(1)[0][0] if seen else (None, None)


def compute_next_match(matches: list[Match], team: str, names: dict[str, str]) -> NextMatch | None:
    upcoming = sorted(
        (m for m in matches if team in (m.home_id, m.away_id) and m.status in ("scheduled", "live")),
        key=lambda m: m.kickoff_utc,
    )
    if not upcoming:
        return None
    m = upcoming[0]
    home = m.home_id == team
    opp = m.away_id if home else m.home_id
    first = next(
        (x for x in matches if {x.home_id, x.away_id} == {team, opp} and x.id != m.id and x.status == "finished"),
        None,
    )
    first_txt = (
        f"{names[first.home_id]} {first.home_goals} x {first.away_goals} {names[first.away_id]}" if first else None
    )
    venue, city = (m.venue, m.city) if m.venue else usual_venue(matches, m.home_id)
    return NextMatch(
        match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc, status=m.status, home=home,
        opponent_id=opp, venue=venue, city=city, first_turn=first_txt,
        form_fortaleza=form(matches, team), form_opponent=form(matches, opp),
    )

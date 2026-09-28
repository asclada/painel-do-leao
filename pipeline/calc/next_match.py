"""Próximo jogo do Fortaleza (card do topo, F1)."""

from __future__ import annotations

from pipeline.calc.common import form
from pipeline.models import Match
from pipeline.outputs import NextMatch


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
    return NextMatch(
        match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc, status=m.status, home=home,
        opponent_id=opp, venue=m.venue, city=m.city, first_turn=first_txt,
        form_fortaleza=form(matches, team), form_opponent=form(matches, opp),
    )

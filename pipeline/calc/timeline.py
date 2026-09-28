"""Posição de cada time ao fim de cada rodada (montanha-russa, F2).

Regra para jogos adiados: a classificação "ao fim da rodada r" inclui todos os jogos
encerrados até o último jogo disputado da rodada r, ignorando no cálculo dessa data de
corte os jogos da rodada r disputados mais de 5 dias depois da mediana da rodada.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from statistics import median

from pipeline.calc.common import finished, goals, opponent, parse_dt, result
from pipeline.calc.standings import compute_standings
from pipeline.models import Match, Team
from pipeline.outputs import TimelinePoint

POSTPONED_GAP = timedelta(days=5)


def round_cutoff(matches: list[Match], rnd: int) -> str | None:
    played = [parse_dt(m.kickoff_utc) for m in matches if m.round == rnd and m.status == "finished"]
    if not played:
        return None
    mid = datetime.fromtimestamp(median(t.timestamp() for t in played), tz=timezone.utc)
    on_time = [t for t in played if t - mid <= POSTPONED_GAP]
    return max(on_time).isoformat()


def positions_by_round(
    teams: list[Team], matches: list[Match], last_round: int
) -> dict[int, dict[str, tuple[int, int]]]:
    """rodada -> time -> (posição, pontos)."""
    done = finished(matches)
    out = {}
    for r in range(1, last_round + 1):
        cut = round_cutoff(matches, r)
        if cut is None:
            continue
        cut_dt = parse_dt(cut)
        subset = [m for m in done if parse_dt(m.kickoff_utc) <= cut_dt]
        table = compute_standings(teams, subset)
        out[r] = {row.team_id: (row.position, row.points) for row in table}
    return out


def team_timeline(
    team: str, matches: list[Match], by_round: dict[int, dict[str, tuple[int, int]]]
) -> list[TimelinePoint]:
    by_round_match = {m.round: m for m in matches if team in (m.home_id, m.away_id)}
    points = []
    for r, table in sorted(by_round.items()):
        pos, pts = table[team]
        m = by_round_match.get(r)
        played = m is not None and m.status == "finished"
        gf, ga = goals(m, team) if played else (None, None)
        points.append(
            TimelinePoint(
                round=r,
                position=pos,
                points=pts,
                result=result(m, team) if played else None,
                match_id=m.id if m else None,
                opponent_id=opponent(m, team) if m else None,
                home=(m.home_id == team) if m else None,
                goals_for=gf,
                goals_against=ga,
            )
        )
    return points

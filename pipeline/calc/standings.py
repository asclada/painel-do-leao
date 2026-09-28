"""Tabela de classificação com os critérios de desempate da Série B 2026.

Pontos -> vitórias -> saldo -> gols pró -> confronto direto (só se exatamente
2 times empatados em tudo acima) -> menos vermelhos -> menos amarelos ->
ordem alfabética (substitui o sorteio, para ser determinístico).
"""

from __future__ import annotations

from collections import defaultdict
from itertools import groupby

from pipeline.models import Match, MatchDetails, Record, StandingRow, Team


def _add(rec: Record, gf: int, ga: int) -> None:
    rec.played += 1
    rec.goals_for += gf
    rec.goals_against += ga
    if gf > ga:
        rec.wins += 1
        rec.points += 3
    elif gf == ga:
        rec.draws += 1
        rec.points += 1
    else:
        rec.losses += 1


def head_to_head(a: str, b: str, matches: list[Match]) -> int:
    """>0 se `a` leva vantagem no confronto direto, <0 se `b`, 0 se empate."""
    pts = {a: 0, b: 0}
    gd = {a: 0, b: 0}
    for m in matches:
        if {m.home_id, m.away_id} != {a, b}:
            continue
        hg, ag = m.home_goals, m.away_goals
        home, away = m.home_id, m.away_id
        gd[home] += hg - ag
        gd[away] += ag - hg
        if hg > ag:
            pts[home] += 3
        elif hg < ag:
            pts[away] += 3
        else:
            pts[home] += 1
            pts[away] += 1
    return (pts[a] - pts[b]) or (gd[a] - gd[b])


def compute_standings(
    teams: list[Team],
    matches: list[Match],
    details: dict[str, MatchDetails] | None = None,
) -> list[StandingRow]:
    done = [m for m in matches if m.status == "finished" and m.home_goals is not None]
    total: dict[str, Record] = defaultdict(Record)
    home: dict[str, Record] = defaultdict(Record)
    away: dict[str, Record] = defaultdict(Record)
    cards: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    has_cards = bool(details)

    for m in done:
        _add(total[m.home_id], m.home_goals, m.away_goals)
        _add(total[m.away_id], m.away_goals, m.home_goals)
        _add(home[m.home_id], m.home_goals, m.away_goals)
        _add(away[m.away_id], m.away_goals, m.home_goals)
        det = (details or {}).get(m.id)
        if det and det.stats:
            for tid, st in det.stats.items():
                cards[tid][0] += st.yellow or 0
                cards[tid][1] += st.red or 0
        else:
            has_cards = False

    names = {t.id: t.name for t in teams}

    def base_key(tid: str):
        r = total[tid]
        return (-r.points, -r.wins, -(r.goals_for - r.goals_against), -r.goals_for)

    ordered = sorted(names, key=lambda t: (base_key(t), cards[t][1], cards[t][0], names[t]))
    # confronto direto: só quando exatamente 2 times estão empatados nos 4 primeiros critérios
    final: list[str] = []
    for _, grp in groupby(ordered, key=base_key):
        grp = list(grp)
        if len(grp) == 2:
            h2h = head_to_head(grp[0], grp[1], done)
            if h2h < 0:
                grp.reverse()
        final += grp

    rows = []
    for pos, tid in enumerate(final, start=1):
        r = total[tid]
        rows.append(
            StandingRow(
                position=pos,
                team_id=tid,
                played=r.played,
                wins=r.wins,
                draws=r.draws,
                losses=r.losses,
                goals_for=r.goals_for,
                goals_against=r.goals_against,
                goal_diff=r.goals_for - r.goals_against,
                points=r.points,
                pct=round(100 * r.points / (3 * r.played)) if r.played else 0,
                yellow=cards[tid][0] if has_cards else None,
                red=cards[tid][1] if has_cards else None,
                home=home[tid],
                away=away[tid],
            )
        )
    return rows

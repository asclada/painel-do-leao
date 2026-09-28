"""Corrida pelo acesso (F3): Fortaleza + times no G6 ou a até 6 pontos do 6º (máx. 7)."""

from __future__ import annotations

from pipeline.calc.common import form, plural
from pipeline.model.summarize import TeamOdds
from pipeline.models import Match, StandingRow
from pipeline.outputs import HeadToHead, Race, RaceFixture, RaceTeam

MAX_TEAMS = 7
GAP_TO_SIXTH = 6


def race_team_ids(standings: list[StandingRow], focus: str) -> list[str]:
    sixth = standings[5].points
    ids = [r.team_id for r in standings if r.position <= 6 or sixth - r.points <= GAP_TO_SIXTH]
    ids = ids[:MAX_TEAMS]
    if focus not in ids:
        ids = ids[: MAX_TEAMS - 1] + [focus]
    order = {r.team_id: r.position for r in standings}
    return sorted(ids, key=order.get)


def compute_race(
    standings: list[StandingRow],
    matches: list[Match],
    odds: list[TeamOdds],
    strength: dict[str, float],
    names: dict[str, str],
    focus: str,
    articles: dict[str, str] | None = None,
) -> Race:
    ids = race_team_ids(standings, focus)
    row = {r.team_id: r for r in standings}
    odd = {o.team_id: o for o in odds}
    top6 = {r.team_id for r in standings if r.position <= 6}
    left = sorted((m for m in matches if m.status not in ("finished", "cancelled")),
                  key=lambda m: (m.kickoff_utc, m.id))

    teams, scores = [], {}
    for tid in ids:
        fx = [
            RaceFixture(match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
                        opponent_id=m.away_id if m.home_id == tid else m.home_id, home=m.home_id == tid,
                        opponent_in_top6=(m.away_id if m.home_id == tid else m.home_id) in top6)
            for m in left if tid in (m.home_id, m.away_id)
        ]
        scores[tid] = sum(strength[f.opponent_id] for f in fx) / len(fx) if fx else 0.0
        r, o = row[tid], odd[tid]
        teams.append(dict(
            team_id=tid, position=r.position, points=r.points, played=r.played, goal_diff=r.goal_diff,
            form=form(matches, tid), remaining_home=sum(f.home for f in fx),
            remaining_away=sum(not f.home for f in fx), remaining_vs_top6=sum(f.opponent_in_top6 for f in fx),
            difficulty_score=round(scores[tid], 3), p_direct=o.p_direct, p_top6=o.p_top6,
            p_promotion=o.p_promotion, fixtures=fx,
        ))

    # tercis entre os times da corrida: mais forte = "Difícil"
    ranked = sorted(ids, key=lambda t: -scores[t])
    n = len(ranked)
    label = {}
    for i, t in enumerate(ranked):
        label[t] = "Difícil" if i < n / 3 else "Média" if i < 2 * n / 3 else "Tranquila"
    race_teams = [RaceTeam(**t, difficulty=label[t["team_id"]]) for t in teams]

    idset = set(ids)
    h2h = [
        HeadToHead(match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
                   home_id=m.home_id, away_id=m.away_id, venue=m.venue)
        for m in left if m.home_id in idset and m.away_id in idset
    ]
    return Race(teams=race_teams, head_to_head=h2h, headline=race_headline(race_teams, h2h, names, focus, articles or {}))


def race_headline(teams: list[RaceTeam], h2h: list[HeadToHead], names: dict[str, str], focus: str,
                  articles: dict[str, str]) -> str:
    me = next(t for t in teams if t.team_id == focus)
    rivals = [t for t in teams if t.team_id != focus]
    if not rivals:
        return "O Leão corre sozinho na frente."
    toughest = max(rivals, key=lambda t: t.remaining_vs_top6)
    if toughest.remaining_vs_top6 > me.remaining_vs_top6:
        art = articles.get(toughest.team_id, "o").upper()
        return (f"{art} {names[toughest.team_id]} ainda enfrenta {plural(toughest.remaining_vs_top6, 'time')} do G6. "
                f"O Fortaleza, só {me.remaining_vs_top6}.")
    if len(h2h) >= 3:
        return f"{plural(len(h2h), 'confronto direto', 'confrontos diretos')} até o fim: é aí que se decide."
    easiest = min(teams, key=lambda t: t.difficulty_score)
    return f"Tabela mais tranquila entre os candidatos: {names[easiest.team_id]}."

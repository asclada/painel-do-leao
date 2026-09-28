from pipeline.calc.standings import compute_standings
from pipeline.models import Match, Team


def test_real_table_matches_cbf(teams, matches_r30, details_r30):
    """Tabela oficial da CBF em 28/09/2026: Vila Nova 54 e Fortaleza 52, 30 jogos cada."""
    table = compute_standings(teams, matches_r30, details_r30)
    top = {r.team_id: r for r in table[:2]}
    assert [r.team_id for r in table[:2]] == ["vila-nova", "fortaleza"]
    v, f = top["vila-nova"], top["fortaleza"]
    assert (v.points, v.played, v.wins, v.draws, v.losses, v.goals_for, v.goals_against) == (54, 30, 16, 6, 8, 43, 31)
    assert (f.points, f.played, f.wins, f.draws, f.losses, f.goals_for, f.goals_against) == (52, 30, 14, 10, 6, 35, 26)
    assert sum(r.points for r in table) == sum(
        3 if m.home_goals != m.away_goals else 2 for m in matches_r30 if m.status == "finished"
    )
    assert f.home.played + f.away.played == f.played


def _t(tid):
    return Team(id=tid, name=tid.upper(), short_name=tid[:3].upper(), color="#000000")


def _m(h, a, hg, ag, rnd=1):
    return Match(id=f"{h}--{a}", round=rnd, kickoff_utc="2026-03-21T19:00:00Z", status="finished",
                 home_id=h, away_id=a, home_goals=hg, away_goals=ag, source="espn")


def test_tiebreak_wins_then_goal_diff():
    teams = [_t("a"), _t("b"), _t("c"), _t("d")]
    matches = [
        _m("a", "c", 1, 0), _m("a", "d", 0, 1),  # a: 3 pts, 1 V
        _m("b", "c", 0, 0), _m("b", "d", 0, 0), _m("b", "a", 0, 0),  # b: 3 pts, 0 V
    ]
    table = compute_standings(teams, matches)
    order = [r.team_id for r in table]
    assert order.index("a") < order.index("b")  # a tem mais vitórias


def test_head_to_head_only_for_two_teams():
    teams = [_t("x"), _t("y"), _t("z")]
    # x e y empatados em pontos, vitórias, saldo e gols; x venceu o confronto direto
    matches = [_m("x", "y", 1, 0), _m("y", "z", 1, 0), _m("z", "x", 1, 0)]
    table = compute_standings(teams, matches)
    # os três empatam em tudo -> grupo de 3: sem confronto direto, vale a ordem alfabética
    assert [r.team_id for r in table] == ["x", "y", "z"]


def test_head_to_head_breaks_exact_pair():
    teams = [_t("a"), _t("b"), _t("c"), _t("d")]
    matches = [
        _m("a", "b", 0, 1),  # b vence a no confronto direto
        _m("a", "c", 1, 0),
        _m("b", "d", 0, 1),
    ]
    # a e b: 3 pts, 1 V, saldo 0, 1 gol pró -> confronto direto põe b à frente
    # (pela ordem alfabética seria a)
    order = [r.team_id for r in compute_standings(teams, matches)]
    assert order.index("b") < order.index("a")

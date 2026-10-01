from datetime import datetime, timedelta, timezone

from pipeline.calc.common import plural
from pipeline.calc.insights import halves_insight, streak_insight, turn_insight, venue_insight
from pipeline.calc.race import difficulty_label, schedule_points
from pipeline.calc.streaks import compute_streaks
from pipeline.calc.timeline import positions_by_round, team_timeline
from pipeline.model.types import Ratings
from pipeline.models import Match, Team
from pipeline.outputs import HalfSplit, RaceFixture, Streaks, TurnSplit, VenueSplit


def test_timeline_real_season(teams, matches_r30):
    by_round = positions_by_round(teams, matches_r30, 30)
    pts = team_timeline("fortaleza", matches_r30, by_round)
    assert pts[0].position == 20 and pts[0].result == "D"  # lanterna após o 4x0 do Botafogo-SP
    assert pts[-1].round == 30 and pts[-1].position == 2 and pts[-1].points == 52


def _m(mid, rnd, day, h, a, hg, ag, status="finished"):
    ko = (datetime(2026, 3, 1, 20, tzinfo=timezone.utc) + timedelta(days=day)).isoformat()
    return Match(id=mid, round=rnd, kickoff_utc=ko, status=status, home_id=h, away_id=a,
                 home_goals=hg if status == "finished" else None, away_goals=ag if status == "finished" else None,
                 source="espn")


def test_postponed_match_counts_when_played():
    teams = [Team(id=x, name=x, short_name=x, color="#000") for x in "abcd"]
    matches = [
        _m("a--b", 1, 0, "a", "b", 1, 0),
        _m("c--d", 1, 20, "c", "d", 3, 0),  # rodada 1, adiado e jogado 20 dias depois
        _m("a--c", 2, 7, "a", "c", 0, 0),
        _m("b--d", 2, 7, "b", "d", 0, 0),
    ]
    by_round = positions_by_round(teams, matches, 2)
    # ao fim da rodada 1 (e da 2) o c x d ainda não tinha sido jogado
    assert by_round[1]["c"][1] == 0
    assert by_round[2]["c"][1] == 1
    assert by_round[2]["a"][0] == 1


def test_streaks_real(matches_r30):
    s = compute_streaks(matches_r30, "fortaleza")
    assert s.current_kind == "unbeaten" and s.current_count == 11
    assert s.current_label == "11 jogos sem perder"
    assert len(s.form) == 5 and "D" not in s.form


def test_plural():
    assert plural(1, "jogo") == "1 jogo"
    assert plural(2, "jogo") == "2 jogos"
    assert plural(2, "posição escalada", "posições escaladas") == "2 posições escaladas"


def _v(pct):
    return VenueSplit(played=10, wins=0, draws=0, losses=0, points=0, pct=pct, goals_for=0, goals_against=0)


def test_insight_rules():
    assert venue_insight(_v(71), _v(44)).startswith("No Castelão o Leão é outro: 71%")
    assert venue_insight(_v(50), _v(55)).startswith("Fora de casa")
    h = HalfSplit(first_for=3, first_against=2, second_for=7, second_against=1, pct_second_half_for=70)
    assert halves_insight(h) == "Time de segundo tempo: 70% dos gols saíram depois do intervalo."
    t1 = TurnSplit(played=19, points=25, ppg=1.32, pct=44)
    t2 = TurnSplit(played=11, points=22, ppg=2.0, pct=67)
    assert turn_insight(t1, t2) == "O returno é outro campeonato: 2,0 pontos por jogo contra 1,3 no 1º turno."
    s = Streaks(current_kind="unbeaten", current_count=1, current_label="", longest_unbeaten=1, longest_wins=0,
                clean_sheets=1, longest_clean_sheets=1, form=[])
    assert streak_insight(s, {}) == "Maior sequência invicta da temporada: 1 jogo."


# --- dificuldade da tabela (corrida) -------------------------------------------------------------


def _ratings(att, dfn):
    """Times com o mesmo fator em casa e fora: att/def < 1 = mais fraco."""
    return Ratings(mu_home=1.4, mu_away=1.1, att_home=att, def_home=dfn, att_away=att, def_away=dfn,
                   strength=[1.0] * len(att))


def _fx(opp, home):
    return RaceFixture(match_id=f"x--{opp}", round=31, kickoff_utc="2026-10-01T00:00Z", opponent_id=opp, home=home,
                       opponent_in_top6=False)


def test_schedule_against_average_teams_is_average():
    r = _ratings([1.0, 1.0], [1.0, 1.0])
    pts = schedule_points(r, {"a": 0, "b": 1}, [_fx("b", True), _fx("b", False)])
    assert abs(pts) < 1e-9 and difficulty_label(pts) == "Média"


def test_away_games_make_the_schedule_harder():
    r = _ratings([1.0, 1.0], [1.0, 1.0])
    idx = {"a": 0, "b": 1}
    home_heavy = schedule_points(r, idx, [_fx("b", True)] * 3 + [_fx("b", False)])
    away_heavy = schedule_points(r, idx, [_fx("b", True)] + [_fx("b", False)] * 3)
    assert home_heavy > 0 > away_heavy


def test_weak_and_strong_opponents_set_the_label():
    # "fraco": ataca pouco e sofre muito; "forte": o contrário
    r = _ratings([1.0, 0.5, 1.6], [1.0, 1.6, 0.6])
    idx = {"a": 0, "fraco": 1, "forte": 2}
    easy = schedule_points(r, idx, [_fx("fraco", True), _fx("fraco", False)] * 2)
    hard = schedule_points(r, idx, [_fx("forte", True), _fx("forte", False)] * 2)
    assert difficulty_label(easy) == "Tranquila" and difficulty_label(hard) == "Difícil"

import time

import numpy as np
import pytest

from pipeline.calc.model_input import build_model_input
from pipeline.calc.standings import compute_standings
from pipeline.model.playoffs import simulate_playoffs
from pipeline.model.ratings import fit_ratings
from pipeline.model.scenario import run_scenario, validate_choices
from pipeline.model.simulate import simulate_season
from pipeline.model.summarize import sanity_check, team_odds
from pipeline.model.types import ModelInput, Ratings, TableState


@pytest.fixture(scope="module")
def model(teams, matches_r30, details_r30):
    st = compute_standings(teams, matches_r30, details_r30)
    return build_model_input(sorted(t.id for t in teams), matches_r30, st, 29)


def test_sanity_sums(model):
    sim = simulate_season(model, 5000, seed=1)
    assert sanity_check(team_odds(sim, model.teams)) == []


def test_same_seed_same_result(model):
    a = simulate_season(model, 2000, seed=7)
    b = simulate_season(model, 2000, seed=7)
    assert np.array_equal(a.positions, b.positions)


def test_all_wins_means_direct_promotion(model):
    n = len(model.focus_remaining)
    r = run_scenario(model, "V" * n, 3000)
    assert r.focus.p_direct > 0.99
    assert r.final_points_min == model.table.points[model.focus_team] + 3 * n


def test_all_losses_lowers_chances(model):
    n = len(model.focus_remaining)
    base = run_scenario(model, None, 3000)
    worst = run_scenario(model, "D" * n, 3000)
    assert worst.focus.p_promotion < base.focus.p_promotion - 0.3


def test_fixed_results_are_respected(model):
    n = len(model.focus_remaining)
    r = run_scenario(model, "E" * n, 2000)
    # todos empates: pontos finais exatos em todas as simulações
    assert r.focus.points_p10 == r.focus.points_p90 == model.table.points[model.focus_team] + n


def test_invalid_choices():
    with pytest.raises(ValueError):
        validate_choices("VVX", 3)
    with pytest.raises(ValueError):
        validate_choices("VV", 3)
    assert validate_choices("ve-", 3) == "VE-"


def test_strong_team_finishes_first():
    """Liga artificial: o time 0 goleia todo mundo -> termina 1º quase sempre."""
    rng = np.random.default_rng(0)
    t = 6
    pairs = [(h, a) for h in range(t) for a in range(t) if h != a]
    home = np.array([p[0] for p in pairs])
    away = np.array([p[1] for p in pairs])
    hg = np.where(home == 0, 4, rng.poisson(1.2, len(pairs)))
    ag = np.where(away == 0, 4, rng.poisson(1.0, len(pairs)))
    hg = np.where(away == 0, 0, hg)
    ag = np.where(home == 0, 0, ag)
    ratings = fit_ratings(t, home, away, hg, ag, np.ones(len(pairs)))
    m = ModelInput(season=2026, last_completed_round=0, teams=[str(i) for i in range(t)], focus_team=0,
                   table=TableState(points=[0] * t, wins=[0] * t, goal_diff=[0] * t, goals_for=[0] * t),
                   ratings=ratings,
                   remaining=[dict(id=f"{h}-{a}", round=1, kickoff_utc="2026-01-01T00:00Z", home=h, away=a)
                              for h, a in pairs],
                   focus_remaining=[])
    sim = simulate_season(m, 2000, seed=3)
    assert (sim.positions[:, 0] == 1).mean() > 0.95


def test_playoff_tie_goes_to_better_campaign():
    """Times idênticos e λ mínimo: muitos empates no agregado -> a melhor campanha leva a maioria."""
    t = 6
    r = Ratings(mu_home=0.01, mu_away=0.01, att_home=[1] * t, def_home=[1] * t, att_away=[1] * t,
                def_away=[1] * t, strength=[1] * t)
    positions = np.tile(np.arange(1, t + 1), (4000, 1))  # time i termina em i+1
    winners = simulate_playoffs(r, positions, np.random.default_rng(0))
    # λ é limitado a 0.2: 3º vence o 6º bem mais que 50% das vezes
    assert winners[:, 2].mean() > 0.6 and winners[:, 3].mean() > 0.6
    assert winners.sum(axis=1).tolist() == [2] * 4000


def test_performance_5000_sims(model):
    run_scenario(model, None, 5000)  # aquece
    t = time.perf_counter()
    run_scenario(model, None, 5000)
    assert time.perf_counter() - t < 0.3

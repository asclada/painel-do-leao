"""Pacote 1: backtest, calibração, jogos que mais mexem na chance e status da fonte."""

from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from pipeline.calc import backtest as bt
from pipeline.calc.calibration import compute_calibration, match_calibration
from pipeline.calc.key_games import compute_key_games
from pipeline.calc.model_input import build_model_input
from pipeline.calc.standings import compute_standings
from pipeline.fetch import data_status, iso
from pipeline.model.match_probs import outcome_probs
from pipeline.model.simulate import simulate_season
from pipeline.models import FetchState
from pipeline.outputs import HistoryEntry
from pipeline.update_data import chance_history


@pytest.fixture(scope="module")
def model(teams, matches_r30, details_r30):
    st = compute_standings(teams, matches_r30, details_r30)
    return build_model_input(sorted(t.id for t in teams), matches_r30, st, 29)


# --- backtest -----------------------------------------------------------------------------------


def test_snapshot_resets_later_rounds(matches_r30):
    snap = bt.snapshot(matches_r30, 10)
    assert all(m.status == "finished" for m in snap if m.round <= 10)
    assert all(m.status == "scheduled" and m.home_goals is None for m in snap if m.round > 10)
    assert len(snap) == len(matches_r30)


def test_snapshot_key_only_depends_on_played_rounds(matches_r30):
    k5 = bt.snapshot_key(matches_r30, 5)
    changed = [m.model_copy(update={"home_goals": 9}) if m.round == 20 else m for m in matches_r30]
    assert bt.snapshot_key(changed, 5) == k5  # jogo da rodada 20 não afeta o retrato da rodada 5
    assert bt.snapshot_key(changed, 20) != bt.snapshot_key(matches_r30, 20)


def test_backtest_reuses_cached_rounds(monkeypatch, teams, matches_r30, details_r30):
    monkeypatch.setattr(bt, "N_SIMS_BACKTEST", 500)
    first = bt.run_backtest(teams, matches_r30, details_r30, 2, log=lambda *_: None)
    assert [b.round for b in first.rounds] == [1, 2]
    b2 = first.rounds[1]
    assert abs(sum(t.p_direct for t in b2.teams.values()) - 2) < 0.02
    assert len(b2.next_matches) == 10  # previsão dos 10 jogos da rodada 3

    def boom(*_a, **_k):
        raise AssertionError("não devia recalcular")

    monkeypatch.setattr(bt, "backtest_round", boom)
    again = bt.run_backtest(teams, matches_r30, details_r30, 2, previous=first, log=lambda *_: None)
    assert again == first


# --- chances por jogo e calibração ------------------------------------------------------------------


def test_outcome_probs_sum_to_one_and_follow_strength(model):
    strong = int(np.argmax(model.ratings.strength))
    weak = int(np.argmin(model.ratings.strength))
    p = outcome_probs(model.ratings, np.array([strong, weak]), np.array([weak, strong]), np.random.default_rng(1))
    assert np.allclose(p.sum(1), 1, atol=1e-6)
    assert p[0, 0] > p[0, 2]  # forte em casa: favorito
    assert p[0, 0] > p[1, 2]  # mando de campo ajuda


def test_match_calibration(teams, matches_r30):
    rnd = bt.BacktestRound(
        round=1, key="x", n_sims=0, seed=0, teams={},
        next_matches=[bt.MatchPrediction(match_id=m.id, p_home=0.5, p_draw=0.3, p_away=0.2)
                      for m in matches_r30 if m.round == 2],
    )
    mc = match_calibration(bt.Backtest(version=bt.BACKTEST_VERSION, rounds=[rnd]), matches_r30)
    assert mc.n_matches == 10 and mc.rounds == [2, 2]
    assert 0 <= mc.brier <= 2
    assert sum(b.n for b in mc.bins) == 30  # 3 chances por jogo
    cal = compute_calibration(bt.Backtest(version=bt.BACKTEST_VERSION, rounds=[rnd]), teams, matches_r30)
    assert cal.season is None  # temporada não terminou
    assert cal.summary is None  # poucos favoritos para a frase do site


# --- jogos que mais mexem na chance ----------------------------------------------------------------


def test_key_games(model):
    sim = simulate_season(model, 4000, seed=3)
    rivals = ["vila-nova", "juventude", "novorizontino", "criciuma", "atletico-go", "crb"]
    kg = compute_key_games(model, sim, rivals)
    assert len(kg.focus) == len(model.focus_remaining)
    assert all(g.if_win > g.if_loss for g in kg.focus)
    assert [g.swing for g in kg.focus] == sorted((g.swing for g in kg.focus), reverse=True)
    assert all(abs(g.p_win + g.p_draw + g.p_loss - 1) < 1e-3 for g in kg.focus)
    assert kg.round == model.remaining[model.focus_remaining[0]].round
    for g in kg.rivals:
        assert "fortaleza" not in (g.home_id, g.away_id)
        assert {g.home_id, g.away_id} & set(rivals)
        assert g.round <= kg.round


# --- histórico da chance e status da fonte -----------------------------------------------------------


def _bt_round(r, p):
    t = bt.BacktestTeam(position=5, points=3 * r, p_direct=p / 2, p_top6=p / 2, p_promotion=p)
    return bt.BacktestRound(round=r, key="k", n_sims=1, seed=1, teams={"fortaleza": t}, next_matches=[])


def test_chance_history_ends_with_live_value(model):
    from pipeline.model.summarize import TeamOdds
    from pipeline.models import Record, StandingRow

    back = bt.Backtest(version=1, rounds=[_bt_round(1, 0.1), _bt_round(2, 0.2)])
    odds = TeamOdds(team_id="fortaleza", p_title=0, p_direct=0.3, p_top6=0.2, p_playoff_promotion=0.1,
                    p_promotion=0.4, p_relegation=0, position_dist=[1.0], expected_points=10,
                    points_p10=1, points_p50=2, points_p90=3)
    row = StandingRow(position=2, team_id="fortaleza", played=3, wins=2, draws=0, losses=1, goals_for=3,
                      goals_against=1, goal_diff=2, points=6, pct=66, home=Record(), away=Record())
    full = chance_history(back, odds, row, 2, partial=False)
    assert [h.round for h in full] == [1, 2] and full[-1].p_promotion == 0.4 and not full[-1].partial
    part = chance_history(back, odds, row, 2, partial=True)
    assert [h.round for h in part] == [1, 2, 3] and part[-1].partial
    assert isinstance(part[-1], HistoryEntry)


def test_data_status(matches_r30):
    last_ko = max(datetime.fromisoformat(m.kickoff_utc.replace("Z", "+00:00")) for m in matches_r30
                  if m.status != "finished" and m.round == 30)
    later = last_ko + timedelta(hours=6)
    ok = FetchState(espn_consecutive_failures=0, last_success_at=iso(datetime(2026, 9, 28, tzinfo=timezone.utc)))
    failing = FetchState(espn_consecutive_failures=2, last_success_at=ok.last_success_at)
    assert data_status(matches_r30, ok, later)["delayed"] is False
    assert data_status(matches_r30, failing, later) == {"delayed": True, "lastSuccessAt": ok.last_success_at}
    # antes do jogo terminar não há atraso, mesmo com a fonte falhando
    assert data_status(matches_r30, failing, last_ko - timedelta(days=1))["delayed"] is False

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


@pytest.fixture(scope="module")
def key_games(model):
    sim = simulate_season(model, 4000, seed=3)
    return compute_key_games(model, sim, 4000, 3)


def test_key_games(model, key_games):
    kg = key_games
    assert len(kg.focus) == len(model.focus_remaining)
    assert all(g.if_win > g.if_draw > g.if_loss for g in kg.focus)
    assert [g.swing for g in kg.focus] == sorted((g.swing for g in kg.focus), reverse=True)
    assert all(abs(g.p_win + g.p_draw + g.p_loss - 1) < 1e-3 for g in kg.focus)
    assert kg.round == model.remaining[model.focus_remaining[0]].round
    for g in kg.rivals:
        assert "fortaleza" not in (g.home_id, g.away_id)
        assert g.round <= kg.round
        assert sorted(g.order) == ["away", "draw", "home"] and g.order[0] == g.best


def test_rival_win_is_never_best_against_a_bottom_team(key_games):
    """Londrina (Z4, 28 pts) x Criciúma (5º, 50 pts): o pior para o Leão é o Criciúma vencer, e a vitória do Londrina
    nunca pode sair pior que o empate (regressão: o método antigo, por grupos de simulações, sugeria o empate)."""
    g = next(g for g in key_games.rivals if g.match_id == "londrina--criciuma")
    assert g.order[-1] == "away"
    assert g.if_home > g.if_away and g.if_draw > g.if_away
    assert g.order[0] == "home" or g.same_top


def test_forced_scenarios_share_the_rest_of_the_season(model):
    """Mesma semente: fixar um jogo não muda os sorteios dos outros jogos (comparação pareada)."""
    from pipeline.model.simulate import FREE, HOME_WIN

    j = next(i for i in range(len(model.remaining)) if i not in model.focus_remaining)
    fixed = np.full(len(model.remaining), FREE)
    fixed[j] = HOME_WIN
    a = simulate_season(model, 2000, seed=5)
    b = simulate_season(model, 2000, seed=5, fixed=fixed)
    others = np.arange(len(model.remaining)) != j
    assert np.array_equal(a.outcomes[:, others], b.outcomes[:, others])
    assert (b.outcomes[:, j] == HOME_WIN).all()


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


# --- garantido/eliminado na matemática e chances do próximo jogo ---------------------------------------


def _table(rows):
    """rows: (time, pontos, jogos) em ordem de classificação."""
    from pipeline.models import Record, StandingRow

    return [StandingRow(position=i + 1, team_id=t, played=j, wins=0, draws=0, losses=0, goals_for=0,
                        goals_against=0, goal_diff=0, points=p, pct=0, home=Record(), away=Record())
            for i, (t, p, j) in enumerate(rows)]


def test_clinch_bounds():
    from pipeline.calc.clinch import compute_clinch

    # 2 rodadas para o fim (36 jogos): 6 pontos em jogo
    rows = [("a", 80, 36), ("b", 73, 36), ("c", 70, 36), ("d", 68, 36)] + [
        (f"t{i}", 60 - i, 36) for i in range(16)
    ]
    c = compute_clinch(_table(rows))
    assert c["a"].direct == "clinched"  # só "b" chega a 80 (79 não chega): no máximo 1 time passa
    assert c["b"].direct == "open"  # "c" e "d" ainda chegam a 73
    assert c["t0"].g6 == "open"  # máximo 66: só 4 times já têm mais
    assert c["t10"].g6 == "eliminated"  # máximo 56: a, b, c, d, t0..t3 (8 times) já têm mais
    assert c["t15"].top16 == "open"


def test_clinch_is_conservative_on_ties():
    from pipeline.calc.clinch import compute_clinch

    rows = [("a", 70, 37), ("b", 67, 37)] + [(f"t{i}", 50, 37) for i in range(18)]
    c = compute_clinch(_table(rows))
    assert c["a"].direct == "clinched"
    assert c["b"].direct == "clinched"  # só "a" chega a 67 ou mais
    assert c["t0"].direct == "eliminated"  # máximo 53 < 67 e 70
    rows2 = [("a", 70, 37), ("b", 67, 37), ("c", 64, 37)] + [(f"t{i}", 50, 37) for i in range(17)]
    assert compute_clinch(_table(rows2))["b"].direct == "open"  # "c" pode empatar com 67: desempate em aberto


def test_clinch_after_the_last_round_uses_the_table():
    from pipeline.calc.clinch import compute_clinch

    rows = [(f"t{i}", 60, 38) for i in range(20)]  # todos empatados em pontos: vale a posição da tabela
    c = compute_clinch(_table(rows))
    assert c["t1"].direct == "clinched" and c["t2"].direct == "eliminated"
    assert c["t16"].top16 == "eliminated" and c["t15"].top16 == "clinched"


def test_next_match_chances(model):
    from pipeline.update_data import next_match_chances

    j = model.focus_remaining[0]
    ch = next_match_chances(model, model.remaining[j].id, seed=1)
    assert abs(ch.win + ch.draw + ch.loss - 1) < 1e-3
    assert next_match_chances(model, "nao-existe", seed=1) is None

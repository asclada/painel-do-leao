"""Desempate da simulação (confronto direto e cartões) e placar de resultado fixado."""

from math import lgamma

import numpy as np

from pipeline.calc.model_input import build_model_input
from pipeline.calc.standings import compute_standings, head_to_head
from pipeline.model.simulate import AWAY_WIN, FREE, TieBreak, _head_to_head, _pair_slots, rank, sample_scores


def _tb(t, h2h_points=None, h2h_gd=None, red=None, yellow=None, home=(), away=()):
    home, away = np.array(home, dtype=int), np.array(away, dtype=int)
    return TieBreak(
        h2h_points=np.zeros((t, t), int) if h2h_points is None else np.array(h2h_points),
        h2h_gd=np.zeros((t, t), int) if h2h_gd is None else np.array(h2h_gd),
        red=None if red is None else np.array(red),
        yellow=None if yellow is None else np.array(yellow),
        slots=_pair_slots(home, away, t),
        home=home,
    )


def _table(n, rows):
    """rows = (pontos, vitórias, saldo, gols pró) por time -> quatro matrizes (n, T)."""
    return [np.tile(np.array(col), (n, 1)) for col in zip(*rows)]


def test_head_to_head_decides_exact_pair():
    # times 0 e 1 empatados em tudo; o 1 venceu o jogo entre eles -> 1 à frente em todas as simulações
    pts, wins, gd, gf = _table(500, [(50, 14, 5, 30), (50, 14, 5, 30), (40, 10, 0, 20)])
    h2h = [[0, 0, 0], [3, 0, 0], [0, 0, 0]]
    gdm = [[0, -1, 0], [1, 0, 0], [0, 0, 0]]
    pos = rank(pts, wins, gd, gf, np.random.default_rng(0), _tb(3, h2h, gdm))
    assert (pos[:, 1] == 1).all() and (pos[:, 0] == 2).all()
    # sem os dados de desempate (model.json antigo): sorteio, metade para cada lado
    old = rank(pts, wins, gd, gf, np.random.default_rng(0))
    assert 0.4 < (old[:, 1] == 1).mean() < 0.6


def test_head_to_head_only_for_two_teams_then_cards():
    # três empatados em tudo: confronto direto não vale; decide quem tem menos vermelhos, depois menos amarelos
    pts, wins, gd, gf = _table(300, [(50, 14, 5, 30)] * 3)
    h2h = [[0, 3, 3], [0, 0, 0], [0, 0, 0]]  # o 0 venceu os dois, mas é empate de 3
    tb = _tb(3, h2h, red=[2, 1, 1], yellow=[10, 50, 40])
    pos = rank(pts, wins, gd, gf, np.random.default_rng(1), tb)
    assert (pos[:, 2] == 1).all() and (pos[:, 1] == 2).all() and (pos[:, 0] == 3).all()


def test_head_to_head_counts_simulated_game():
    # 0 e 1 empatados em tudo, 1 x 1 no turno; no returno simulado (1 mandante) o 0 vence fora
    order = np.array([[1, 0, 2], [0, 1, 2]])
    stats = tuple(np.array([[50, 50, 40]] * 2) for _ in range(4))
    tb = _tb(3, home=[1], away=[0])
    tb.hg, tb.ag = np.array([[0], [2]]), np.array([[1], [1]])
    out = _head_to_head(order, stats, tb)
    assert out[0].tolist() == [0, 1, 2]  # simulação 0: 0 venceu -> sobe
    assert out[1].tolist() == [1, 0, 2]  # simulação 1: 1 venceu -> sobe


def test_simulation_without_games_left_matches_real_table(teams, matches_r30, details_r30):
    """Sem jogos restantes, a simulação tem que repetir a tabela real (mesmos critérios do standings.py)."""
    done = [m for m in matches_r30 if m.status == "finished"]
    st = compute_standings(teams, done, details_r30)
    team_ids = sorted(t.id for t in teams)
    model = build_model_input(team_ids, done, st, 30)
    tb = TieBreak.from_table(model.table, np.array([], int), np.array([], int))
    table = [np.tile(np.asarray(getattr(model.table, k)), (50, 1)) for k in ("points", "wins", "goal_diff", "goals_for")]
    pos = rank(*table, np.random.default_rng(2), tb)
    expected = [team_ids.index(r.team_id) for r in st]
    assert (np.argsort(pos, axis=1) == np.array(expected)).all()


def test_model_input_head_to_head_matches_standings(teams, matches_r30, details_r30):
    st = compute_standings(teams, matches_r30, details_r30)
    team_ids = sorted(t.id for t in teams)
    model = build_model_input(team_ids, matches_r30, st, 30)
    hp, hg = np.array(model.table.h2h_points), np.array(model.table.h2h_goal_diff)
    done = [m for m in matches_r30 if m.status == "finished"]
    for i, a in enumerate(team_ids):
        for j, b in enumerate(team_ids[i + 1:], start=i + 1):
            mine = (hp[i, j] - hp[j, i]) or hg[i, j]
            assert np.sign(mine) == np.sign(head_to_head(a, b, done))
    assert model.table.red is not None and len(model.table.red) == len(team_ids)


def _poisson(lam, k):
    return np.exp(k * np.log(lam) - lam - np.array([lgamma(x + 1) for x in k]))


def test_improbable_fixed_result_follows_conditional_distribution():
    """Vitória do visitante com λ 4 x 0,2 (~0,3%): quase nunca sai em 30 tentativas. Antes virava 0x1 sempre;
    agora o placar segue a distribuição condicionada (inclui 0x2, 1x2...)."""
    n = 40_000
    lam_h, lam_a = np.array([4.0]), np.array([0.2])
    hg, ag = sample_scores(np.random.default_rng(3), lam_h, lam_a, n, np.array([AWAY_WIN]))
    assert (hg[:, 0] < ag[:, 0]).all()
    k = np.arange(16)
    joint = np.outer(_poisson(4.0, k), _poisson(0.2, k)) * (k[:, None] < k[None, :])
    joint /= joint.sum()
    assert abs(ag.mean() - (joint * k[None, :]).sum()) < 0.02
    assert abs(((hg == 0) & (ag == 1)).mean() - joint[0, 1]) < 0.01


def test_free_games_untouched_by_fixing():
    lam_h, lam_a = np.array([1.4, 1.1]), np.array([0.9, 1.0])
    a = sample_scores(np.random.default_rng(4), lam_h, lam_a, 2000, np.array([FREE, FREE]), np.random.default_rng(9))
    b = sample_scores(np.random.default_rng(4), lam_h, lam_a, 2000, np.array([FREE, AWAY_WIN]), np.random.default_rng(9))
    assert np.array_equal(a[0][:, 0], b[0][:, 0]) and np.array_equal(a[1][:, 0], b[1][:, 0])

"""Monte Carlo do campeonato inteiro (todos os jogos restantes de todos os times).

Tudo vetorizado: os placares de todas as N temporadas e M jogos saem de uma vez
(matriz N x M) e a tabela vira matrizes N x T. Sem loop Python por temporada.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from pipeline.model.playoffs import simulate_playoffs
from pipeline.config import PARAM_UNCERTAINTY
from pipeline.model.ratings import draw_factors
from pipeline.model.types import ModelInput

# Resultado fixado, na visão do MANDANTE
FREE, HOME_WIN, DRAW, AWAY_WIN = -1, 0, 1, 2
MAX_RESAMPLE = 30


@dataclass
class SimResult:
    points: np.ndarray  # (N, T) pontos finais
    positions: np.ndarray  # (N, T) posição final, 1..T
    promoted: np.ndarray  # (N, T) bool: subiu (direto ou playoffs)
    playoff_winner: np.ndarray  # (N, T) bool: subiu pelos playoffs
    outcomes: np.ndarray | None = None  # (N, M) resultado de cada jogo restante, na visão do mandante (HOME_WIN/DRAW/AWAY_WIN)


def _outcome(hg: np.ndarray, ag: np.ndarray) -> np.ndarray:
    return np.where(hg > ag, HOME_WIN, np.where(hg == ag, DRAW, AWAY_WIN))


def sample_scores(
    rng: np.random.Generator,
    lam_h: np.ndarray,
    lam_a: np.ndarray,
    n: int,
    fixed: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Placares (N, M). λ vem (M,) ou (N, M) (uma força por simulação). Jogos com resultado fixado
    são reamostrados só nas simulações incompatíveis; o que sobrar após 30 tentativas vira 1x0/1x1/0x1."""
    m = lam_h.shape[-1]
    lam_h = np.broadcast_to(lam_h, (n, m))
    lam_a = np.broadcast_to(lam_a, (n, m))
    hg = rng.poisson(lam_h)
    ag = rng.poisson(lam_a)
    if fixed is None or not (fixed != FREE).any():
        return hg, ag
    cols = np.flatnonzero(fixed != FREE)
    for _ in range(MAX_RESAMPLE):
        bad = _outcome(hg[:, cols], ag[:, cols]) != fixed[cols]
        if not bad.any():
            break
        rows, which = np.nonzero(bad)
        c = cols[which]
        hg[rows, c] = rng.poisson(lam_h[rows, c])
        ag[rows, c] = rng.poisson(lam_a[rows, c])
    bad = _outcome(hg[:, cols], ag[:, cols]) != fixed[cols]
    if bad.any():
        rows, which = np.nonzero(bad)
        c = cols[which]
        want = fixed[c]
        hg[rows, c] = np.where(want == AWAY_WIN, 0, 1)
        ag[rows, c] = np.where(want == HOME_WIN, 0, 1)
    return hg, ag


def rank(points, wins, gd, gf, rng) -> np.ndarray:
    """Posição final (1..T) de cada time em cada simulação.
    pontos -> vitórias -> saldo -> gols pró -> sorteio."""
    tie = rng.random(points.shape)
    order = np.lexsort((tie, -gf, -gd, -wins, -points), axis=-1)  # (N, T): índices dos times, do 1º ao último
    pos = np.empty_like(order)
    np.put_along_axis(pos, order, np.arange(1, points.shape[1] + 1)[None, :].repeat(len(points), 0), axis=-1)
    return pos


def simulate_season(
    model: ModelInput, n: int, seed: int, fixed: np.ndarray | None = None, uncertainty: bool = PARAM_UNCERTAINTY
) -> SimResult:
    rng = np.random.default_rng(seed)
    factors = draw_factors(model.ratings, n, rng, uncertainty)
    t = len(model.teams)
    home = np.array([r.home for r in model.remaining], dtype=int)
    away = np.array([r.away for r in model.remaining], dtype=int)

    base = model.table
    pts = np.tile(np.asarray(base.points), (n, 1))
    wins = np.tile(np.asarray(base.wins), (n, 1))
    gd = np.tile(np.asarray(base.goal_diff), (n, 1))
    gf = np.tile(np.asarray(base.goals_for), (n, 1))

    outcomes = np.empty((n, 0), dtype=np.int8)
    if len(home):
        lam_h, lam_a = factors.lambdas(home, away)
        hg, ag = sample_scores(rng, lam_h, lam_a, n, fixed)
        # matrizes de incidência (M, T): soma por time via produto de matrizes
        H = np.zeros((len(home), t), dtype=np.int32)
        A = np.zeros((len(home), t), dtype=np.int32)
        H[np.arange(len(home)), home] = 1
        A[np.arange(len(home)), away] = 1
        hw, dr, aw = (hg > ag).astype(np.int32), (hg == ag).astype(np.int32), (hg < ag).astype(np.int32)
        pts += (3 * hw + dr) @ H + (3 * aw + dr) @ A
        wins += hw @ H + aw @ A
        gd += (hg - ag) @ H + (ag - hg) @ A
        gf += hg @ H + ag @ A
        outcomes = _outcome(hg, ag).astype(np.int8)

    positions = rank(pts, wins, gd, gf, rng)
    playoff_winner = simulate_playoffs(factors, positions, rng)
    promoted = (positions <= 2) | playoff_winner
    return SimResult(
        points=pts, positions=positions, promoted=promoted, playoff_winner=playoff_winner, outcomes=outcomes
    )

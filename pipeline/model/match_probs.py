"""Chance de vitória do mandante, empate e vitória do visitante em jogos isolados.

Mesmo modelo da simulação (Poisson com mando e força sorteada da posteriori), mas calculado direto
pela distribuição de gols, sem sortear placares. Usado na calibração (backtest).
"""

from __future__ import annotations

from math import lgamma

import numpy as np

from pipeline.config import PARAM_UNCERTAINTY
from pipeline.model.ratings import draw_factors
from pipeline.model.types import Ratings

MAX_GOALS = 15  # λ ≤ 4: a chance de passar de 15 gols é desprezível


def _pmf(lam: np.ndarray) -> np.ndarray:
    """P(gols = k) para k = 0..MAX_GOALS; `lam` (...,) -> (..., K)."""
    k = np.arange(MAX_GOALS + 1)
    log_fact = np.array([lgamma(i + 1) for i in k])
    return np.exp(k * np.log(lam[..., None]) - lam[..., None] - log_fact)


def outcome_probs(
    ratings: Ratings,
    home: np.ndarray,
    away: np.ndarray,
    rng: np.random.Generator,
    n_draws: int = 4000,
    uncertainty: bool = PARAM_UNCERTAINTY,
) -> np.ndarray:
    """(M, 3): chance de vitória do mandante, empate e vitória do visitante em cada jogo."""
    if len(home) == 0:
        return np.zeros((0, 3))
    factors = draw_factors(ratings, n_draws, rng, uncertainty)
    lam_h, lam_a = factors.lambdas(np.asarray(home), np.asarray(away))  # (N ou 1, M)
    ph, pa = _pmf(lam_h), _pmf(lam_a)  # (N, M, K)
    cdf_a = np.cumsum(pa, axis=-1)
    below = np.concatenate([np.zeros_like(cdf_a[..., :1]), cdf_a[..., :-1]], axis=-1)  # P(visitante < k)
    p_home = (ph * below).sum(-1)
    p_draw = (ph * pa).sum(-1)
    probs = np.stack([p_home, p_draw, 1 - p_home - p_draw], axis=-1).mean(axis=0)
    return np.clip(probs, 0, 1)

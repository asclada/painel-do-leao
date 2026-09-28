"""Força dos times: modelo de gols de Poisson com mando, encolhimento e peso para jogos recentes."""

from __future__ import annotations

import numpy as np

from pipeline.config import HALF_LIFE_ROUNDS, LAMBDA_MAX, LAMBDA_MIN, SHRINK_GAMES
from pipeline.model.types import Ratings


def fit_ratings(
    n_teams: int,
    home: np.ndarray,
    away: np.ndarray,
    home_goals: np.ndarray,
    away_goals: np.ndarray,
    rounds: np.ndarray,
    k: float = SHRINK_GAMES,
    half_life: float = HALF_LIFE_ROUNDS,
) -> Ratings:
    """Recebe os jogos encerrados (arrays alinhados) e devolve os 4 fatores por time.

    fator > 1 no ataque = marca mais que a média; na defesa = sofre mais que a média.
    """
    home, away = np.asarray(home), np.asarray(away)
    hg, ag = np.asarray(home_goals, float), np.asarray(away_goals, float)
    w = 0.5 ** ((rounds.max() - np.asarray(rounds, float)) / half_life)

    mu_h = float((w * hg).sum() / w.sum())
    mu_a = float((w * ag).sum() / w.sum())

    def wsum(idx, values):
        return np.bincount(idx, weights=w * values, minlength=n_teams)

    n_home = np.bincount(home, weights=w, minlength=n_teams)
    n_away = np.bincount(away, weights=w, minlength=n_teams)
    gf_home, ga_home = wsum(home, hg), wsum(home, ag)
    gf_away, ga_away = wsum(away, ag), wsum(away, hg)

    att_home = (gf_home + k * mu_h) / ((n_home + k) * mu_h)
    def_home = (ga_home + k * mu_a) / ((n_home + k) * mu_a)
    att_away = (gf_away + k * mu_a) / ((n_away + k) * mu_a)
    def_away = (ga_away + k * mu_h) / ((n_away + k) * mu_h)
    strength = ((att_home + att_away) / 2) / ((def_home + def_away) / 2)

    return Ratings(
        mu_home=round(mu_h, 6),
        mu_away=round(mu_a, 6),
        att_home=np.round(att_home, 6).tolist(),
        def_home=np.round(def_home, 6).tolist(),
        att_away=np.round(att_away, 6).tolist(),
        def_away=np.round(def_away, 6).tolist(),
        strength=np.round(strength, 6).tolist(),
    )


def expected_goals(r: Ratings, home: np.ndarray, away: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """λ do mandante e do visitante para cada par (vetorizado)."""
    ah, dh = np.asarray(r.att_home), np.asarray(r.def_home)
    aa, da = np.asarray(r.att_away), np.asarray(r.def_away)
    lam_h = r.mu_home * ah[home] * da[away]
    lam_a = r.mu_away * aa[away] * dh[home]
    return np.clip(lam_h, LAMBDA_MIN, LAMBDA_MAX), np.clip(lam_a, LAMBDA_MIN, LAMBDA_MAX)

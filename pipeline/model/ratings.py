"""Força dos times: modelo de gols de Poisson com mando, encolhimento e peso para jogos recentes.

Leitura bayesiana (Gamma-Poisson): cada fator θ de um time (ataque/defesa, em casa/fora) tem prior
Gamma(k·μ, k·μ), com média 1 = a média da liga, e os gols ponderados do time (G) sobre a exposição
ponderada (n·μ) atualizam esse prior. A posteriori é Gamma(G + k·μ, (n + k)·μ), cuja média é
exatamente a fórmula de encolhimento abaixo. Usa os jogos dos 20 clubes, separados por mando.
"""

from __future__ import annotations

import numpy as np

from pipeline.config import HALF_LIFE_ROUNDS, LAMBDA_MAX, LAMBDA_MIN, SHRINK_GAMES
from pipeline.model.types import GammaPosterior, Ratings


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

    def post(goals, games, mu):
        return GammaPosterior(
            shape=np.round(goals + k * mu, 6).tolist(),
            rate=np.round((games + k) * mu, 6).tolist(),
        )

    posterior = {
        "att_home": post(gf_home, n_home, mu_h),
        "def_home": post(ga_home, n_home, mu_a),
        "att_away": post(gf_away, n_away, mu_a),
        "def_away": post(ga_away, n_away, mu_h),
    }

    return Ratings(
        mu_home=round(mu_h, 6),
        mu_away=round(mu_a, 6),
        att_home=np.round(att_home, 6).tolist(),
        def_home=np.round(def_home, 6).tolist(),
        att_away=np.round(att_away, 6).tolist(),
        def_away=np.round(def_away, 6).tolist(),
        strength=np.round(strength, 6).tolist(),
        posterior=posterior,
    )



FACTORS = ("att_home", "def_home", "att_away", "def_away")


class Factors:
    """Fatores de força por simulação: arrays (N, T), ou (1, T) quando são os valores pontuais."""

    def __init__(self, mu_home: float, mu_away: float, arrays: dict[str, np.ndarray]):
        self.mu_home, self.mu_away = mu_home, mu_away
        self.att_home, self.def_home = arrays["att_home"], arrays["def_home"]
        self.att_away, self.def_away = arrays["att_away"], arrays["def_away"]

    def lambdas(
        self, home: np.ndarray, away: np.ndarray, rows: np.ndarray | None = None
    ) -> tuple[np.ndarray, np.ndarray]:
        """λ do mandante e do visitante.

        Sem `rows`: `home`/`away` são os M jogos -> (N ou 1, M).
        Com `rows`: um par por simulação (ex.: playoffs), `rows[i]` é a simulação do par i -> (len(rows),).
        """
        if rows is not None and self.att_home.shape[0] == 1:
            rows = np.zeros_like(rows)

        def pick(a, t):
            return a[rows, t] if rows is not None else a[:, t]

        lam_h = self.mu_home * pick(self.att_home, home) * pick(self.def_away, away)
        lam_a = self.mu_away * pick(self.att_away, away) * pick(self.def_home, home)
        return np.clip(lam_h, LAMBDA_MIN, LAMBDA_MAX), np.clip(lam_a, LAMBDA_MIN, LAMBDA_MAX)


def draw_factors(r: Ratings, n: int, rng: np.random.Generator, uncertainty: bool = True) -> Factors:
    """Distribuição preditiva: sorteia a força de cada time da posteriori em cada uma das N simulações.

    Assim a simulação leva em conta a sorte dos jogos E a dúvida sobre o quanto cada time é bom.
    Sem posteriori (ou com uncertainty=False), usa os fatores pontuais em todas as simulações.
    """
    t = len(r.att_home)
    if uncertainty and r.posterior:
        arrays = {
            f: rng.gamma(np.asarray(r.posterior[f].shape), 1 / np.asarray(r.posterior[f].rate), size=(n, t))
            for f in FACTORS
        }
    else:
        arrays = {f: np.asarray(getattr(r, f), float)[None, :] for f in FACTORS}
    return Factors(r.mu_home, r.mu_away, arrays)

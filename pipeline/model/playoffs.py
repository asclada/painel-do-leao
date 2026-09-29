"""Playoffs de acesso da Série B 2026 (regulamento confirmado em 28/09/2026).

- 3º x 6º e 4º x 5º, ida e volta; a melhor campanha faz a volta em casa.
- Empate no placar agregado: sobe a melhor campanha (não há pênaltis).
- Os vencedores dos dois confrontos sobem.

Os gols saem de números sorteados ANTES de saber quem joga (um por vaga: confronto, jogo e lado) e viram placar
pela distribuição de Poisson do confronto real. A distribuição é a mesma de sortear direto, mas dois cenários com a
mesma semente usam os mesmos números mesmo quando os classificados mudam: a comparação entre cenários fica justa
(ver pipeline/calc/key_games.py).
"""

from __future__ import annotations

from math import lgamma

import numpy as np

from pipeline.model.ratings import Factors

MAX_GOALS = 15


def poisson_from_uniform(u: np.ndarray, lam: np.ndarray) -> np.ndarray:
    """Inversa da acumulada de Poisson: u ~ U(0,1) -> gols ~ Poisson(lam), elemento a elemento."""
    k = np.arange(MAX_GOALS + 1)
    log_fact = np.array([lgamma(i + 1) for i in k])
    pmf = np.exp(k * np.log(lam[:, None]) - lam[:, None] - log_fact)
    cdf = np.cumsum(pmf, axis=1)
    return (cdf < u[:, None]).sum(axis=1)


def simulate_playoffs(factors: Factors, positions: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Recebe as posições finais (N, T) e devolve (N, T) bool: quem subiu pelos playoffs.
    Cada simulação usa as forças sorteadas para ela (as mesmas da temporada)."""
    n, t = positions.shape
    u = rng.random((2, 4, n))  # [confronto][ida mandante, ida visitante, volta mandante, volta visitante][simulação]
    team_at = np.argsort(positions, axis=1)  # team_at[s, p-1] = time na posição p
    winners = np.zeros((n, t), dtype=bool)
    rows = np.arange(n)
    for tie, (better_pos, worse_pos) in enumerate(((3, 6), (4, 5))):
        better = team_at[:, better_pos - 1]
        worse = team_at[:, worse_pos - 1]
        # ida: pior campanha em casa
        lh1, la1 = factors.lambdas(worse, better, rows)
        g_worse_1, g_better_1 = poisson_from_uniform(u[tie, 0], lh1), poisson_from_uniform(u[tie, 1], la1)
        # volta: melhor campanha em casa
        lh2, la2 = factors.lambdas(better, worse, rows)
        g_better_2, g_worse_2 = poisson_from_uniform(u[tie, 2], lh2), poisson_from_uniform(u[tie, 3], la2)
        agg_better = g_better_1 + g_better_2
        agg_worse = g_worse_1 + g_worse_2
        better_wins = agg_better >= agg_worse  # empate no agregado: melhor campanha
        winner = np.where(better_wins, better, worse)
        winners[rows, winner] = True
    return winners

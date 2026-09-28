"""Playoffs de acesso da Série B 2026 (regulamento confirmado em 28/09/2026).

- 3º x 6º e 4º x 5º, ida e volta; a melhor campanha faz a volta em casa.
- Empate no placar agregado: sobe a melhor campanha (não há pênaltis).
- Os vencedores dos dois confrontos sobem.
"""

from __future__ import annotations

import numpy as np

from pipeline.model.ratings import expected_goals
from pipeline.model.types import Ratings


def simulate_playoffs(ratings: Ratings, positions: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Recebe as posições finais (N, T) e devolve (N, T) bool: quem subiu pelos playoffs."""
    n, t = positions.shape
    team_at = np.argsort(positions, axis=1)  # team_at[s, p-1] = time na posição p
    winners = np.zeros((n, t), dtype=bool)
    rows = np.arange(n)
    for better_pos, worse_pos in ((3, 6), (4, 5)):
        better = team_at[:, better_pos - 1]
        worse = team_at[:, worse_pos - 1]
        # ida: pior campanha em casa
        lh1, la1 = expected_goals(ratings, worse, better)
        g_worse_1, g_better_1 = rng.poisson(lh1), rng.poisson(la1)
        # volta: melhor campanha em casa
        lh2, la2 = expected_goals(ratings, better, worse)
        g_better_2, g_worse_2 = rng.poisson(lh2), rng.poisson(la2)
        agg_better = g_better_1 + g_better_2
        agg_worse = g_worse_1 + g_worse_2
        better_wins = agg_better >= agg_worse  # empate no agregado: melhor campanha
        winner = np.where(better_wins, better, worse)
        winners[rows, winner] = True
    return winners

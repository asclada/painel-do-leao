"""Cenário do simulador "E se?": resultados escolhidos para os jogos do Fortaleza.

Usado pela FastAPI (/api/py/simular) e pelos testes. As escolhas vêm como texto,
um caractere por jogo restante do Fortaleza, em ordem cronológica:
V = vitória do Fortaleza, E = empate, D = derrota, - = deixar o modelo sortear.
"""

from __future__ import annotations

import hashlib

import numpy as np

from pipeline.model.simulate import AWAY_WIN, DRAW, FREE, HOME_WIN, simulate_season
from pipeline.model.summarize import MagicNumbers, TeamOdds, magic_numbers, team_odds
from pipeline.model.types import ModelInput
from pipeline.models import Model

VALID = set("VED-")


class ScenarioResult(Model):
    choices: str
    n_sims: int
    fixed_points: int  # pontos garantidos pelas escolhas (V=3, E=1)
    final_points_min: int  # pontos finais se todos os jogos livres forem derrota
    final_points_max: int  # ... se forem vitória
    expected_points: float
    most_likely_position: int
    focus: TeamOdds
    magic: MagicNumbers


def validate_choices(choices: str, n_games: int) -> str:
    choices = choices.upper()
    if len(choices) != n_games:
        raise ValueError(f"São {n_games} jogos restantes; recebi {len(choices)} escolhas.")
    bad = set(choices) - VALID
    if bad:
        raise ValueError(f"Use só V, E, D ou '-' (recebi {''.join(sorted(bad))}).")
    return choices


def scenario_seed(choices: str, last_round: int) -> int:
    h = hashlib.sha256(f"{last_round}:{choices}".encode()).hexdigest()
    return int(h[:12], 16)


def fixed_vector(model: ModelInput, choices: str) -> np.ndarray:
    fixed = np.full(len(model.remaining), FREE)
    for c, j in zip(choices, model.focus_remaining):
        if c == "-":
            continue
        focus_home = model.remaining[j].home == model.focus_team
        if c == "E":
            fixed[j] = DRAW
        elif (c == "V") == focus_home:
            fixed[j] = HOME_WIN
        else:
            fixed[j] = AWAY_WIN
    return fixed


def run_scenario(model: ModelInput, choices: str | None, n: int) -> ScenarioResult:
    n_games = len(model.focus_remaining)
    choices = validate_choices(choices if choices else "-" * n_games, n_games)
    seed = scenario_seed(choices, model.last_completed_round)
    sim = simulate_season(model, n, seed, fixed_vector(model, choices))
    f = model.focus_team
    odds = team_odds(sim, model.teams)[f]
    cur = model.table.points[f]
    fixed_pts = sum(3 if c == "V" else 1 if c == "E" else 0 for c in choices)
    free = choices.count("-")
    return ScenarioResult(
        choices=choices,
        n_sims=n,
        fixed_points=fixed_pts,
        final_points_min=cur + fixed_pts,
        final_points_max=cur + fixed_pts + 3 * free,
        expected_points=odds.expected_points,
        most_likely_position=int(np.argmax(odds.position_dist)) + 1,
        focus=odds,
        magic=magic_numbers(sim, f, cur, n_games),
    )

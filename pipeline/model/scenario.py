"""Cenário do simulador "E se?": resultados escolhidos para os jogos do Fortaleza (e, opcionalmente, dos rivais).

Usado pela FastAPI (/api/py/simular) e pelos testes. As escolhas do Fortaleza vêm como texto,
um caractere por jogo restante do Fortaleza, em ordem cronológica:
V = vitória do Fortaleza, E = empate, D = derrota, - = deixar o modelo sortear.

Jogos de outros times (os confrontos diretos da corrida, no site) vêm à parte, em `extra`:
"mandante--visitante:1,outro--jogo:X", com 1 = vitória do mandante, X = empate, 2 = vitória do visitante.
"""

from __future__ import annotations

import hashlib

import numpy as np

from pipeline.model.simulate import AWAY_WIN, DRAW, FREE, HOME_WIN, simulate_season
from pipeline.model.summarize import MagicNumbers, TeamOdds, magic_numbers, team_odds
from pipeline.model.types import ModelInput
from pipeline.models import Model

VALID = set("VED-")
EXTRA_CODES = {"1": HOME_WIN, "X": DRAW, "2": AWAY_WIN}
MAX_EXTRA = 30


class ScenarioResult(Model):
    choices: str
    extra: str = ""  # jogos de outros times fixados, na forma canônica (ordem cronológica)
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


def parse_extra(model: ModelInput, raw: str | None) -> dict[int, int]:
    """'id:1,id:X' -> {índice em model.remaining: resultado}. Só jogos que faltam e que não são do Fortaleza."""
    if not raw:
        return {}
    index = {r.id: j for j, r in enumerate(model.remaining)}
    out: dict[int, int] = {}
    for part in raw.split(","):
        match_id, sep, code = part.strip().partition(":")
        j = index.get(match_id)
        if not sep or j is None:
            raise ValueError(f"Jogo desconhecido ou já disputado: {match_id or part}.")
        m = model.remaining[j]
        if model.focus_team in (m.home, m.away):
            raise ValueError("Os jogos do Fortaleza vão no parâmetro p.")
        code = code.upper()
        if code not in EXTRA_CODES:
            raise ValueError(f"Use 1, X ou 2 para {match_id} (recebi {code or 'nada'}).")
        out[j] = EXTRA_CODES[code]
    if len(out) > MAX_EXTRA:
        raise ValueError(f"No máximo {MAX_EXTRA} jogos de outros times.")
    return out


def canonical_extra(model: ModelInput, extra: dict[int, int]) -> str:
    code = {v: k for k, v in EXTRA_CODES.items()}
    return ",".join(f"{model.remaining[j].id}:{code[o]}" for j, o in sorted(extra.items()))


def scenario_seed(choices: str, last_round: int, extra: str = "") -> int:
    # sem jogos extras, a semente é a mesma de antes (os links antigos dão o mesmo número)
    key = f"{last_round}:{choices}" + (f":{extra}" if extra else "")
    h = hashlib.sha256(key.encode()).hexdigest()
    return int(h[:12], 16)


def fixed_vector(model: ModelInput, choices: str, extra: dict[int, int] | None = None) -> np.ndarray:
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
    for j, o in (extra or {}).items():
        fixed[j] = o
    return fixed


def run_scenario(model: ModelInput, choices: str | None, n: int, extra: str | None = None) -> ScenarioResult:
    n_games = len(model.focus_remaining)
    choices = validate_choices(choices if choices else "-" * n_games, n_games)
    fixed_extra = parse_extra(model, extra)
    extra_key = canonical_extra(model, fixed_extra)
    seed = scenario_seed(choices, model.last_completed_round, extra_key)
    sim = simulate_season(model, n, seed, fixed_vector(model, choices, fixed_extra))
    f = model.focus_team
    odds = team_odds(sim, model.teams)[f]
    cur = model.table.points[f]
    fixed_pts = sum(3 if c == "V" else 1 if c == "E" else 0 for c in choices)
    free = choices.count("-")
    return ScenarioResult(
        choices=choices,
        extra=extra_key,
        n_sims=n,
        fixed_points=fixed_pts,
        final_points_min=cur + fixed_pts,
        final_points_max=cur + fixed_pts + 3 * free,
        expected_points=odds.expected_points,
        most_likely_position=int(np.argmax(odds.position_dist)) + 1,
        focus=odds,
        magic=magic_numbers(sim, f, cur, n_games),
    )

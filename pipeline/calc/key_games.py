"""Jogos que mais mexem na chance de acesso do Fortaleza.

Para cada jogo, simula o campeonato três vezes com o resultado FIXADO (vitória do mandante, empate, vitória do
visitante), com a MESMA semente das simulações do topo. Como a reamostragem do jogo fixado usa um gerador próprio
(pipeline/model/simulate.py), o resto do campeonato é idêntico nos três cenários: a diferença entre eles é só o
resultado daquele jogo. É o mesmo "fixar o resultado" do simulador.

(Antes separávamos as simulações do topo pelo resultado de cada jogo. Os grupos eram simulações diferentes, e o
ruído entre eles — ~0,8 ponto de chance — era maior que o efeito de um ponto a mais para um rival: dava empate
como "melhor resultado" em Londrina x Criciúma, quando o certo é o Londrina vencer.)

Os placares dos playoffs também saem de números sorteados antes (pipeline/model/playoffs.py), senão a troca de um
classificado sorteava tudo de novo e o ruído voltava.

- Jogos do Fortaleza: os próximos (até MAX_FOCUS), do que mais mexe para o que menos mexe.
- "Pra secar": TODOS os outros jogos até a rodada do próximo jogo do Leão (inclui sobras de rodadas anteriores);
  ficam os que mexem pelo menos MIN_RIVAL_SWING. Não depende da lista da corrida: um 8º colocado brigando pelo G6
  também conta. Cada jogo traz a ordem dos três resultados, do melhor para o pior, e se dois deles praticamente
  empatam (diferença menor que SAME_EPS), para o site não escolher um vencedor por um fio.
"""

from __future__ import annotations

from typing import Literal

import numpy as np

from pipeline.model.simulate import AWAY_WIN, DRAW, FREE, HOME_WIN, SimResult, simulate_season
from pipeline.model.types import ModelInput
from pipeline.models import Model

MIN_RIVAL_SWING = 0.01  # jogos que mexem menos de 1 ponto na chance não aparecem
SAME_EPS = 0.01  # dois resultados a menos de 1 ponto de chance um do outro contam como "tanto faz" (e na tela
# mostram o mesmo número arredondado); o ruído que sobra entre cenários fica em ~0,15 ponto
MAX_FOCUS = 12  # no começo do campeonato, só os 12 próximos jogos do Leão (tempo do Actions)

Outcome = Literal["home", "draw", "away"]
OUTCOME_NAME: dict[int, Outcome] = {HOME_WIN: "home", DRAW: "draw", AWAY_WIN: "away"}


class FocusGame(Model):
    match_id: str
    round: int
    kickoff_utc: str
    opponent_id: str
    home: bool
    p_win: float  # chance do resultado, segundo o modelo
    p_draw: float
    p_loss: float
    if_win: float  # chance de acesso do Fortaleza se o jogo terminar assim
    if_draw: float
    if_loss: float
    swing: float  # vitória menos derrota


class RivalGame(Model):
    match_id: str
    round: int
    kickoff_utc: str
    home_id: str
    away_id: str
    p_home: float
    p_draw: float
    p_away: float
    if_home: float
    if_draw: float
    if_away: float
    best: Outcome  # resultado que mais ajuda o Fortaleza
    order: list[Outcome]  # os três resultados, do que mais ajuda para o que mais atrapalha
    same_top: bool  # 1º e 2º praticamente iguais para o Leão
    same_bottom: bool  # 2º e 3º praticamente iguais
    gain: float  # chance com o melhor resultado menos a chance de agora
    swing: float  # melhor menos pior


class KeyGames(Model):
    baseline: float  # chance de acesso agora (a mesma do topo)
    round: int | None  # rodada do próximo jogo do Fortaleza ("nesta rodada")
    focus: list[FocusGame]
    rivals: list[RivalGame]


def _r(x: float) -> float:
    return round(float(x), 4)


def forced_chances(model: ModelInput, j: int, n: int, seed: int) -> dict[int, float]:
    """Resultado fixado do jogo j (visão do mandante) -> chance de acesso do Fortaleza."""
    out = {}
    for o in (HOME_WIN, DRAW, AWAY_WIN):
        fixed = np.full(len(model.remaining), FREE)
        fixed[j] = o
        sim = simulate_season(model, n, seed, fixed)
        out[o] = float(sim.promoted[:, model.focus_team].mean())
    return out


def _freq(sim: SimResult, j: int) -> dict[int, float]:
    """Chance de cada resultado do jogo j, segundo as simulações do topo."""
    col = sim.outcomes[:, j]
    return {o: float((col == o).mean()) for o in (HOME_WIN, DRAW, AWAY_WIN)}


def compute_key_games(model: ModelInput, sim: SimResult, n: int, seed: int) -> KeyGames:
    """`sim`, `n` e `seed`: as simulações do topo (mesma semente = cenários comparáveis com a chance de agora)."""
    f = model.focus_team
    baseline = float(sim.promoted[:, f].mean())

    focus_games = []
    for j in model.focus_remaining[:MAX_FOCUS]:
        m = model.remaining[j]
        home = m.home == f
        win, loss = (HOME_WIN, AWAY_WIN) if home else (AWAY_WIN, HOME_WIN)
        chance, freq = forced_chances(model, j, n, seed), _freq(sim, j)
        focus_games.append(FocusGame(
            match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
            opponent_id=model.teams[m.away if home else m.home], home=home,
            p_win=_r(freq[win]), p_draw=_r(freq[DRAW]), p_loss=_r(freq[loss]),
            if_win=_r(chance[win]), if_draw=_r(chance[DRAW]), if_loss=_r(chance[loss]),
            swing=_r(chance[win] - chance[loss]),
        ))
    focus_games.sort(key=lambda g: -g.swing)

    target = model.remaining[model.focus_remaining[0]].round if model.focus_remaining else None
    rival_games = []
    if target is not None:
        for j, m in enumerate(model.remaining):
            if m.round > target or f in (m.home, m.away):
                continue
            chance, freq = forced_chances(model, j, n, seed), _freq(sim, j)
            order = sorted(chance, key=chance.get, reverse=True)
            best = order[0]
            swing = chance[best] - chance[order[2]]
            if swing < MIN_RIVAL_SWING:
                continue
            rival_games.append(RivalGame(
                match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
                home_id=model.teams[m.home], away_id=model.teams[m.away],
                p_home=_r(freq[HOME_WIN]), p_draw=_r(freq[DRAW]), p_away=_r(freq[AWAY_WIN]),
                if_home=_r(chance[HOME_WIN]), if_draw=_r(chance[DRAW]), if_away=_r(chance[AWAY_WIN]),
                best=OUTCOME_NAME[best], order=[OUTCOME_NAME[o] for o in order],
                same_top=chance[order[0]] - chance[order[1]] < SAME_EPS,
                same_bottom=chance[order[1]] - chance[order[2]] < SAME_EPS,
                gain=_r(chance[best] - baseline), swing=_r(swing),
            ))
    rival_games.sort(key=lambda g: -g.swing)
    return KeyGames(baseline=_r(baseline), round=target, focus=focus_games, rivals=rival_games)

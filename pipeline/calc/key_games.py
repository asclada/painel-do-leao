"""Jogos que mais mexem na chance de acesso do Fortaleza.

Usa as mesmas simulações do topo (sem simular de novo): para cada jogo que falta, separa as temporadas
simuladas em que o mandante venceu, empatou ou perdeu e mede a chance de acesso do Fortaleza em cada grupo.
É a chance "se esse jogo terminar assim", com o resto do campeonato em aberto.

- Jogos do Fortaleza: todos os que faltam, do que mais mexe para o que menos mexe.
- "Pra secar": jogos dos rivais da corrida na rodada do próximo jogo do Leão (e sobras de rodadas anteriores).
"""

from __future__ import annotations

from typing import Literal

from pipeline.model.simulate import AWAY_WIN, DRAW, HOME_WIN, SimResult
from pipeline.model.types import ModelInput
from pipeline.models import Model

MIN_SAMPLES = 200  # abaixo disso, a chance condicional é ruído demais: vira None
MIN_RIVAL_SWING = 0.005  # jogos de rival que mexem menos de 0,5 ponto na chance não aparecem

Outcome = Literal["home", "draw", "away"]


class FocusGame(Model):
    match_id: str
    round: int
    kickoff_utc: str
    opponent_id: str
    home: bool
    p_win: float  # chance do resultado, segundo o modelo
    p_draw: float
    p_loss: float
    if_win: float | None  # chance de acesso do Fortaleza se o jogo terminar assim
    if_draw: float | None
    if_loss: float | None
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
    if_home: float | None
    if_draw: float | None
    if_away: float | None
    best: Outcome  # resultado que mais ajuda o Fortaleza
    gain: float  # chance com o melhor resultado menos a chance de agora
    swing: float  # melhor menos pior


class KeyGames(Model):
    baseline: float  # chance de acesso agora (a mesma do topo)
    round: int | None  # rodada do próximo jogo do Fortaleza ("nesta rodada")
    focus: list[FocusGame]
    rivals: list[RivalGame]


def _r(x: float | None) -> float | None:
    return None if x is None else round(float(x), 4)


def _conditional(sim: SimResult, j: int, focus: int) -> dict[int, tuple[float, float | None]]:
    """resultado (visão do mandante) -> (frequência, chance de acesso do Fortaleza dado o resultado)."""
    col = sim.outcomes[:, j]
    promoted = sim.promoted[:, focus]
    out = {}
    for o in (HOME_WIN, DRAW, AWAY_WIN):
        mask = col == o
        n = int(mask.sum())
        out[o] = (n / len(col), float(promoted[mask].mean()) if n >= MIN_SAMPLES else None)
    return out


def compute_key_games(model: ModelInput, sim: SimResult, rival_ids: list[str]) -> KeyGames:
    f = model.focus_team
    baseline = float(sim.promoted[:, f].mean())

    focus_games = []
    for j in model.focus_remaining:
        m = model.remaining[j]
        home = m.home == f
        c = _conditional(sim, j, f)
        win, loss = (HOME_WIN, AWAY_WIN) if home else (AWAY_WIN, HOME_WIN)
        if_win, if_loss = c[win][1], c[loss][1]
        focus_games.append(FocusGame(
            match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
            opponent_id=model.teams[m.away if home else m.home], home=home,
            p_win=_r(c[win][0]), p_draw=_r(c[DRAW][0]), p_loss=_r(c[loss][0]),
            if_win=_r(if_win), if_draw=_r(c[DRAW][1]), if_loss=_r(if_loss),
            swing=_r((if_win or 0) - (if_loss or 0)) if if_win is not None and if_loss is not None else 0.0,
        ))
    focus_games.sort(key=lambda g: -g.swing)

    target = model.remaining[model.focus_remaining[0]].round if model.focus_remaining else None
    rivals = {model.teams.index(t) for t in rival_ids if t in model.teams} - {f}
    rival_games = []
    if target is not None:
        for j, m in enumerate(model.remaining):
            if m.round > target or f in (m.home, m.away) or not ({m.home, m.away} & rivals):
                continue
            c = _conditional(sim, j, f)
            known = {o: p for o, (_, p) in c.items() if p is not None}
            if len(known) < 2:
                continue
            best = max(known, key=known.get)
            swing = known[best] - min(known.values())
            if swing < MIN_RIVAL_SWING:
                continue
            rival_games.append(RivalGame(
                match_id=m.id, round=m.round, kickoff_utc=m.kickoff_utc,
                home_id=model.teams[m.home], away_id=model.teams[m.away],
                p_home=_r(c[HOME_WIN][0]), p_draw=_r(c[DRAW][0]), p_away=_r(c[AWAY_WIN][0]),
                if_home=_r(c[HOME_WIN][1]), if_draw=_r(c[DRAW][1]), if_away=_r(c[AWAY_WIN][1]),
                best={HOME_WIN: "home", DRAW: "draw", AWAY_WIN: "away"}[best],
                gain=_r(known[best] - baseline), swing=_r(swing),
            ))
    rival_games.sort(key=lambda g: -g.swing)
    return KeyGames(baseline=_r(baseline), round=target, focus=focus_games, rivals=rival_games)

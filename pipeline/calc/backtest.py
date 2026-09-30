"""Backtest rodada a rodada: a chance de cada time como o modelo teria calculado depois de cada rodada.

Retrato "depois da rodada r" = só os jogos das rodadas 1..r contam como disputados; o resto é simulado,
com o mesmo modelo e semente fixa por rodada. Cada retrato guarda também a previsão (vitória/empate/derrota)
dos jogos da rodada r+1, usada na calibração.

Custo: cada retrato é uma simulação completa. O resultado fica em data/backtest.json com uma chave (hash dos
jogos até a rodada + parâmetros do modelo); nas execuções normais só a rodada nova é calculada.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np

from pipeline.calc.model_input import build_model_input
from pipeline.calc.standings import compute_standings
from pipeline.config import (
    HALF_LIFE_ROUNDS,
    N_SIMS_BACKTEST,
    PARAM_UNCERTAINTY,
    SHRINK_GAMES,
)
from pipeline.model.match_probs import outcome_probs
from pipeline.model.simulate import simulate_season
from pipeline.model.summarize import team_odds
from pipeline.models import Match, MatchDetails, Model, Team

# Muda quando a forma de calcular o backtest muda: força recalcular todas as rodadas.
BACKTEST_VERSION = 2  # 2: confronto direto e cartões no desempate; placar fixado sem placar padrão
SEED_BASE = 90_000


class BacktestTeam(Model):
    position: int  # posição na tabela depois da rodada
    points: int
    p_direct: float
    p_top6: float  # 3º a 6º
    p_promotion: float


class MatchPrediction(Model):
    match_id: str
    p_home: float
    p_draw: float
    p_away: float


class BacktestRound(Model):
    round: int
    key: str
    n_sims: int
    seed: int
    teams: dict[str, BacktestTeam]
    next_matches: list[MatchPrediction]  # previsão dos jogos da rodada seguinte


class Backtest(Model):
    version: int
    rounds: list[BacktestRound]


def snapshot(matches: list[Match], r: int) -> list[Match]:
    """Temporada como estava depois da rodada r: jogos de rodadas posteriores voltam a 'a disputar'."""
    return [
        m if m.round <= r else m.model_copy(update=dict(
            status="scheduled", home_goals=None, away_goals=None, ht_home_goals=None, ht_away_goals=None,
        ))
        for m in matches
    ]


def snapshot_key(matches: list[Match], r: int) -> str:
    played = sorted(
        (m.id, m.round, m.home_goals, m.away_goals) for m in matches if m.round <= r and m.status == "finished"
    )
    params = [BACKTEST_VERSION, N_SIMS_BACKTEST, SHRINK_GAMES, HALF_LIFE_ROUNDS, PARAM_UNCERTAINTY]
    raw = json.dumps([params, played], separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def backtest_round(
    teams: list[Team], matches: list[Match], details: dict[str, MatchDetails], r: int, key: str
) -> BacktestRound:
    snap = snapshot(matches, r)
    done_ids = {m.id for m in snap if m.status == "finished"}
    standings = compute_standings(teams, snap, {k: v for k, v in details.items() if k in done_ids})
    team_ids = sorted(t.id for t in teams)
    model = build_model_input(team_ids, snap, standings, r)
    seed = SEED_BASE + r
    sim = simulate_season(model, N_SIMS_BACKTEST, seed)
    odds = {o.team_id: o for o in team_odds(sim, team_ids)}
    row = {s.team_id: s for s in standings}

    idx = {t: i for i, t in enumerate(team_ids)}
    nxt = [m for m in matches if m.round == r + 1]
    probs = outcome_probs(
        model.ratings,
        np.array([idx[m.home_id] for m in nxt], dtype=int),
        np.array([idx[m.away_id] for m in nxt], dtype=int),
        np.random.default_rng(seed + 1),
    )
    return BacktestRound(
        round=r,
        key=key,
        n_sims=N_SIMS_BACKTEST,
        seed=seed,
        teams={
            t: BacktestTeam(
                position=row[t].position,
                points=row[t].points,
                p_direct=odds[t].p_direct,
                p_top6=odds[t].p_top6,
                p_promotion=odds[t].p_promotion,
            )
            for t in team_ids
        },
        next_matches=[
            MatchPrediction(match_id=m.id, p_home=round(float(p[0]), 4), p_draw=round(float(p[1]), 4),
                            p_away=round(float(p[2]), 4))
            for m, p in zip(nxt, probs)
        ],
    )


def run_backtest(
    teams: list[Team],
    matches: list[Match],
    details: dict[str, MatchDetails],
    last_round: int,
    previous: Backtest | None = None,
    log=print,
) -> Backtest:
    """Retratos das rodadas 1..last_round, reaproveitando os que não mudaram."""
    cached = {b.round: b for b in (previous.rounds if previous and previous.version == BACKTEST_VERSION else [])}
    out = []
    for r in range(1, last_round + 1):
        key = snapshot_key(matches, r)
        hit = cached.get(r)
        if hit is not None and hit.key == key:
            out.append(hit)
            continue
        log(f"Backtest: calculando a rodada {r}")
        out.append(backtest_round(teams, matches, details, r, key))
    return Backtest(version=BACKTEST_VERSION, rounds=out)

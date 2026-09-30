"""Monte Carlo do campeonato inteiro (todos os jogos restantes de todos os times).

Tudo vetorizado: os placares de todas as N temporadas e M jogos saem de uma vez
(matriz N x M) e a tabela vira matrizes N x T. Sem loop Python por temporada.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import lgamma

import numpy as np

from pipeline.model.playoffs import simulate_playoffs
from pipeline.config import PARAM_UNCERTAINTY
from pipeline.model.ratings import draw_factors
from pipeline.model.types import ModelInput, TableState

# Resultado fixado, na visão do MANDANTE
FREE, HOME_WIN, DRAW, AWAY_WIN = -1, 0, 1, 2
MAX_RESAMPLE = 30
MAX_GOALS = 15  # grade de placares da amostragem condicional (0 a 15 gols de cada lado)


@dataclass
class SimResult:
    points: np.ndarray  # (N, T) pontos finais
    positions: np.ndarray  # (N, T) posição final, 1..T
    promoted: np.ndarray  # (N, T) bool: subiu (direto ou playoffs)
    playoff_winner: np.ndarray  # (N, T) bool: subiu pelos playoffs
    outcomes: np.ndarray | None = None  # (N, M) resultado de cada jogo restante, na visão do mandante (HOME_WIN/DRAW/AWAY_WIN)


def _outcome(hg: np.ndarray, ag: np.ndarray) -> np.ndarray:
    return np.where(hg > ag, HOME_WIN, np.where(hg == ag, DRAW, AWAY_WIN))


def sample_scores(
    rng: np.random.Generator,
    lam_h: np.ndarray,
    lam_a: np.ndarray,
    n: int,
    fixed: np.ndarray | None = None,
    rng_fix: np.random.Generator | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Placares (N, M). λ vem (M,) ou (N, M) (uma força por simulação). Jogos com resultado fixado
    são reamostrados só nas simulações incompatíveis; o que sobrar após 30 tentativas (resultado muito improvável
    naquela simulação) sai direto da distribuição de placares condicionada ao resultado. Assim todo placar fixado
    segue a distribuição "dado que o mandante venceu" (ou empatou, ou perdeu), sem placar padrão.

    A reamostragem usa `rng_fix` (gerador próprio): assim o `rng` principal consome sempre os mesmos números,
    com ou sem resultado fixado, e dois cenários com a mesma semente só diferem nos jogos fixados
    (comparação justa, por exemplo "Londrina vence" x "empate" com o resto do campeonato idêntico)."""
    rng_fix = rng_fix or rng
    m = lam_h.shape[-1]
    lam_h = np.broadcast_to(lam_h, (n, m))
    lam_a = np.broadcast_to(lam_a, (n, m))
    hg = rng.poisson(lam_h)
    ag = rng.poisson(lam_a)
    if fixed is None or not (fixed != FREE).any():
        return hg, ag
    cols = np.flatnonzero(fixed != FREE)
    for _ in range(MAX_RESAMPLE):
        bad = _outcome(hg[:, cols], ag[:, cols]) != fixed[cols]
        if not bad.any():
            break
        rows, which = np.nonzero(bad)
        c = cols[which]
        hg[rows, c] = rng_fix.poisson(lam_h[rows, c])
        ag[rows, c] = rng_fix.poisson(lam_a[rows, c])
    bad = _outcome(hg[:, cols], ag[:, cols]) != fixed[cols]
    if bad.any():
        rows, which = np.nonzero(bad)
        c = cols[which]
        hg[rows, c], ag[rows, c] = _conditional_scores(lam_h[rows, c], lam_a[rows, c], fixed[c], rng_fix)
    return hg, ag


_GOALS = np.arange(MAX_GOALS + 1)
_LOG_FACT = np.array([lgamma(k + 1) for k in _GOALS])
_GRID_OUTCOME = _outcome(*np.meshgrid(_GOALS, _GOALS, indexing="ij")).ravel()  # resultado de cada placar da grade


def _conditional_scores(
    lam_h: np.ndarray, lam_a: np.ndarray, want: np.ndarray, rng: np.random.Generator
) -> tuple[np.ndarray, np.ndarray]:
    """Um placar por elemento, da Poisson dupla (lam_h, lam_a) condicionada ao resultado `want`."""
    ph = np.exp(_GOALS * np.log(lam_h[:, None]) - lam_h[:, None] - _LOG_FACT)
    pa = np.exp(_GOALS * np.log(lam_a[:, None]) - lam_a[:, None] - _LOG_FACT)
    joint = (ph[:, :, None] * pa[:, None, :]).reshape(len(want), -1)
    joint *= _GRID_OUTCOME[None, :] == want[:, None]
    cdf = np.cumsum(joint, axis=1)
    k = (cdf < rng.random(len(want))[:, None] * cdf[:, -1:]).sum(axis=1)
    return k // (MAX_GOALS + 1), k % (MAX_GOALS + 1)


def _pair_slots(home: np.ndarray, away: np.ndarray, t: int) -> list[np.ndarray]:
    """Jogos restantes entre cada par de times: slots[k][i, j] = índice do k-ésimo jogo entre i e j, ou -1.
    Quase sempre um slot só (o jogo do returno); jogos adiados podem deixar dois entre o mesmo par."""
    slots: list[np.ndarray] = []
    for j, (h, a) in enumerate(zip(home, away)):
        free = [sl for sl in slots if sl[h, a] < 0]
        if free:
            sl = free[0]
        else:
            sl = np.full((t, t), -1)
            slots.append(sl)
        sl[h, a] = sl[a, h] = j
    return slots


@dataclass
class TieBreak:
    """O que o desempate usa depois de gols pró: confronto direto (jogos disputados + placares simulados)
    e cartões."""

    h2h_points: np.ndarray  # (T, T): pontos de i contra j nos jogos disputados
    h2h_gd: np.ndarray  # (T, T): saldo de i contra j
    red: np.ndarray | None  # (T,)
    yellow: np.ndarray | None
    slots: list[np.ndarray]  # _pair_slots dos jogos restantes
    home: np.ndarray  # (M,) mandante de cada jogo restante
    hg: np.ndarray | None = None  # (N, M) placares simulados
    ag: np.ndarray | None = None

    @classmethod
    def from_table(cls, table: TableState, home: np.ndarray, away: np.ndarray) -> TieBreak | None:
        if table.h2h_points is None or table.h2h_goal_diff is None:
            return None
        cards = table.red is not None and table.yellow is not None
        return cls(
            h2h_points=np.asarray(table.h2h_points),
            h2h_gd=np.asarray(table.h2h_goal_diff),
            red=np.asarray(table.red) if cards else None,
            yellow=np.asarray(table.yellow) if cards else None,
            slots=_pair_slots(home, away, len(table.points)),
            home=home,
        )


def _head_to_head(order: np.ndarray, stats: tuple[np.ndarray, ...], tb: TieBreak) -> np.ndarray:
    """Confronto direto onde EXATAMENTE 2 times empatam em pontos, vitórias, saldo e gols pró (regulamento, igual a
    pipeline/calc/standings.py): mais pontos nos jogos entre os dois, depois o saldo neles. Empate também no
    confronto mantém a ordem dos cartões/sorteio."""
    keys = np.stack([np.take_along_axis(x, order, axis=1) for x in stats], axis=-1)  # (N, T, 4) na ordem final
    eq = (keys[:, 1:] == keys[:, :-1]).all(-1)  # (N, T-1): a posição p empata com a p+1
    pad = np.pad(eq, ((0, 0), (1, 1)))
    pair = eq & ~pad[:, :-2] & ~pad[:, 2:]  # só 2: nem o de cima nem o de baixo entram no empate
    s, p = np.nonzero(pair)
    if not len(s):
        return order
    a, b = order[s, p], order[s, p + 1]
    dp = tb.h2h_points[a, b] - tb.h2h_points[b, a]
    dg = tb.h2h_gd[a, b].copy()
    if tb.hg is not None:
        for slot in tb.slots:
            j = slot[a, b]
            has = j >= 0
            if not has.any():
                continue
            sj, jj = s[has], j[has]
            a_home = tb.home[jj] == a[has]
            g_a = np.where(a_home, tb.hg[sj, jj], tb.ag[sj, jj])
            g_b = np.where(a_home, tb.ag[sj, jj], tb.hg[sj, jj])
            dp[has] += 3 * (g_a > g_b) - 3 * (g_b > g_a)
            dg[has] += g_a - g_b
    swap = (dp < 0) | ((dp == 0) & (dg < 0))
    if swap.any():
        order = order.copy()
        order[s[swap], p[swap]] = b[swap]
        order[s[swap], p[swap] + 1] = a[swap]
    return order


def rank(points, wins, gd, gf, rng, tb: TieBreak | None = None) -> np.ndarray:
    """Posição final (1..T) de cada time em cada simulação, com os critérios do regulamento:
    pontos -> vitórias -> saldo -> gols pró -> confronto direto (só entre 2) -> menos vermelhos ->
    menos amarelos -> sorteio. Os cartões são os de hoje (a simulação não prevê cartões): uma aproximação.
    Sem `tb` (model.json antigo): pontos -> vitórias -> saldo -> gols pró -> sorteio."""
    tie = rng.random(points.shape)
    keys = [tie]
    if tb is not None and tb.red is not None:
        keys += [np.broadcast_to(tb.yellow, points.shape), np.broadcast_to(tb.red, points.shape)]
    keys += [-gf, -gd, -wins, -points]
    order = np.lexsort(keys, axis=-1)  # (N, T): índices dos times, do 1º ao último
    if tb is not None:
        order = _head_to_head(order, (points, wins, gd, gf), tb)
    pos = np.empty_like(order)
    np.put_along_axis(pos, order, np.arange(1, points.shape[1] + 1)[None, :].repeat(len(points), 0), axis=-1)
    return pos


def simulate_season(
    model: ModelInput, n: int, seed: int, fixed: np.ndarray | None = None, uncertainty: bool = PARAM_UNCERTAINTY
) -> SimResult:
    rng = np.random.default_rng(seed)
    factors = draw_factors(model.ratings, n, rng, uncertainty)
    t = len(model.teams)
    home = np.array([r.home for r in model.remaining], dtype=int)
    away = np.array([r.away for r in model.remaining], dtype=int)

    base = model.table
    pts = np.tile(np.asarray(base.points), (n, 1))
    wins = np.tile(np.asarray(base.wins), (n, 1))
    gd = np.tile(np.asarray(base.goal_diff), (n, 1))
    gf = np.tile(np.asarray(base.goals_for), (n, 1))

    outcomes = np.empty((n, 0), dtype=np.int8)
    tb = TieBreak.from_table(base, home, away)
    if len(home):
        lam_h, lam_a = factors.lambdas(home, away)
        hg, ag = sample_scores(rng, lam_h, lam_a, n, fixed, np.random.default_rng([seed, 1]))
        # matrizes de incidência (M, T): soma por time via produto de matrizes
        H = np.zeros((len(home), t), dtype=np.int32)
        A = np.zeros((len(home), t), dtype=np.int32)
        H[np.arange(len(home)), home] = 1
        A[np.arange(len(home)), away] = 1
        hw, dr, aw = (hg > ag).astype(np.int32), (hg == ag).astype(np.int32), (hg < ag).astype(np.int32)
        pts += (3 * hw + dr) @ H + (3 * aw + dr) @ A
        wins += hw @ H + aw @ A
        gd += (hg - ag) @ H + (ag - hg) @ A
        gf += hg @ H + ag @ A
        outcomes = _outcome(hg, ag).astype(np.int8)
        if tb is not None:
            tb.hg, tb.ag = hg, ag

    positions = rank(pts, wins, gd, gf, rng, tb)
    playoff_winner = simulate_playoffs(factors, positions, rng)
    promoted = (positions <= 2) | playoff_winner
    return SimResult(
        points=pts, positions=positions, promoted=promoted, playoff_winner=playoff_winner, outcomes=outcomes
    )

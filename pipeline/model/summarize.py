"""Transforma as simulações em chances por time e nos "números mágicos" do Fortaleza."""

from __future__ import annotations

import numpy as np

from pipeline.model.simulate import SimResult
from pipeline.models import Model

MAGIC_THRESHOLD = 0.9
MAGIC_MIN_SAMPLES = 50  # só confia numa pontuação final se ela aparecer em >= 50 simulações


class TeamOdds(Model):
    team_id: str
    p_title: float
    p_direct: float  # 1º ou 2º
    p_top6: float  # 3º a 6º
    p_playoff_promotion: float
    p_promotion: float  # direto + playoffs
    p_relegation: float  # 17º a 20º
    position_dist: list[float]  # [p(1º), ..., p(20º)]
    expected_points: float
    points_p10: int
    points_p50: int
    points_p90: int


class PointsDist(Model):
    """Chance de terminar com cada pontuação: probs[i] = P(pontos finais = min + i)."""

    min: int
    probs: list[float]


def points_dist(sim: SimResult, focus: int, tail: float = 0.001) -> PointsDist:
    """Histograma dos pontos finais de um time, sem as pontas com menos de 0,1% somadas de cada lado."""
    pts = sim.points[:, focus]
    counts = np.bincount(pts - pts.min()) / len(pts)
    cum = np.cumsum(counts)
    lo = int(np.searchsorted(cum, tail))
    hi = int(np.searchsorted(cum, 1 - tail))
    return PointsDist(min=int(pts.min()) + lo, probs=[_r(x) for x in counts[lo : hi + 1]])


class MagicNumbers(Model):
    points_for_90_direct: int | None  # pontuação final que garante >= 90% de acesso direto
    points_for_90_top6: int | None  # idem para terminar no G6 (1º a 6º)
    wins_needed_direct: int | None  # vitórias nos jogos restantes para chegar lá (resto derrota)
    wins_needed_top6: int | None
    remaining_games: int
    current_points: int


def _r(x: float) -> float:
    return round(float(x), 4)


def team_odds(sim: SimResult, teams: list[str]) -> list[TeamOdds]:
    pos, pts = sim.positions, sim.points
    t = len(teams)
    out = []
    for i, tid in enumerate(teams):
        p = pos[:, i]
        dist = np.bincount(p, minlength=t + 1)[1:] / len(p)
        q10, q50, q90 = np.percentile(pts[:, i], [10, 50, 90])
        out.append(
            TeamOdds(
                team_id=tid,
                p_title=_r((p == 1).mean()),
                p_direct=_r((p <= 2).mean()),
                p_top6=_r(((p >= 3) & (p <= 6)).mean()),
                p_playoff_promotion=_r(sim.playoff_winner[:, i].mean()),
                p_promotion=_r(sim.promoted[:, i].mean()),
                p_relegation=_r((p >= t - 3).mean()),
                position_dist=[_r(x) for x in dist],
                expected_points=round(float(pts[:, i].mean()), 1),
                points_p10=int(q10),
                points_p50=int(q50),
                points_p90=int(q90),
            )
        )
    return out


def _threshold_points(points: np.ndarray, success: np.ndarray) -> int | None:
    """Menor pontuação final v tal que, para toda pontuação >= v com amostra
    suficiente, a taxa de sucesso é >= 90%."""
    values = np.unique(points)
    ok_from = None
    for v in values[::-1]:
        mask = points == v
        if mask.sum() < MAGIC_MIN_SAMPLES:
            continue
        if success[mask].mean() >= MAGIC_THRESHOLD:
            ok_from = int(v)
        else:
            break
    return ok_from


def magic_numbers(sim: SimResult, focus: int, current_points: int, remaining_games: int) -> MagicNumbers:
    pts = sim.points[:, focus]
    pos = sim.positions[:, focus]
    direct = _threshold_points(pts, pos <= 2)
    top6 = _threshold_points(pts, pos <= 6)

    def wins(v):
        if v is None:
            return None
        need = max(0, int(np.ceil((v - current_points) / 3)))
        return need if need <= remaining_games else None

    return MagicNumbers(
        points_for_90_direct=direct,
        points_for_90_top6=top6,
        wins_needed_direct=wins(direct),
        wins_needed_top6=wins(top6),
        remaining_games=remaining_games,
        current_points=current_points,
    )


def sanity_check(odds: list[TeamOdds], tol: float = 0.02) -> list[str]:
    """Devolve a lista de problemas (vazia = ok)."""
    errors = []
    checks = {
        "pDirect": (sum(o.p_direct for o in odds), 2.0),
        "pTop6": (sum(o.p_top6 for o in odds), 4.0),
        "pRelegation": (sum(o.p_relegation for o in odds), 4.0),
        "pPromotion": (sum(o.p_promotion for o in odds), 4.0),
        "pTitle": (sum(o.p_title for o in odds), 1.0),
    }
    for name, (got, want) in checks.items():
        if abs(got - want) > tol:
            errors.append(f"soma de {name} = {got:.4f} (esperado {want})")
    for o in odds:
        s = sum(o.position_dist)
        if abs(s - 1) > tol:
            errors.append(f"positionDist de {o.team_id} soma {s:.4f}")
    return errors

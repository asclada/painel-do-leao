"""Playoffs: os dois confrontos (3º x 6º e 4º x 5º) e as contas do confronto do Leão.

Regulamento (confirmado em 28/09/2026): ida e volta, a melhor campanha faz a volta em casa e, com empate no placar
somado, passa a melhor campanha (sem pênaltis). Quem passa sobe para a Série A.

As chances usam o mesmo modelo da temporada (Poisson com mando e força sorteada da posteriori, `draw_factors`), com as
forças dos pontos corridos. As contas são exatas pela distribuição de gols (sem sortear placar): para cada força
sorteada, a chance de cada placar da ida e da volta; as duas partidas usam a MESMA força sorteada, então a dúvida
sobre o quanto cada time é bom vale para o confronto inteiro.
"""

from __future__ import annotations

from math import lgamma

import numpy as np

from pipeline.calc.common import finished, form, goals, result, team_matches
from pipeline.calc.next_match import usual_venue
from pipeline.calc.streaks import compute_streaks
from pipeline.calc.xray import compute_xray_parts
from pipeline.config import FORTALEZA_ID, PARAM_UNCERTAINTY, TOTAL_ROUNDS
from pipeline.model.ratings import draw_factors
from pipeline.model.types import ModelInput
from pipeline.models import Match, MatchDetails, PlayoffMatch, StandingRow
from pipeline.outputs import (
    FocusTie,
    H2HGame,
    MarginRow,
    MatchChances,
    NextMatch,
    PlayoffLeg,
    Playoffs,
    PlayoffTie,
    ScoreCell,
    TapeSide,
)

PAIRS = ((3, 6), (4, 5))  # posições: melhor campanha x pior campanha
N_DRAWS = 20_000
MAX_GOALS = 15
GRID_GOALS = 4  # placares de 0 a 4 para cada lado no mapa
MARGIN_CAP = 3  # "vencer por 3 ou mais" / "perder por 3 ou mais"


def _r(x: float) -> float:
    return round(float(x), 4)


def _pmf(lam: np.ndarray) -> np.ndarray:
    k = np.arange(MAX_GOALS + 1)
    log_fact = np.array([lgamma(i + 1) for i in k])
    return np.exp(k * np.log(lam[..., None]) - lam[..., None] - log_fact)


class LegDist:
    """Placar de um jogo, por força sorteada: joint[n, a, b] = P(Leão faz a, adversário faz b)."""

    def __init__(self, lam_focus: np.ndarray, lam_opp: np.ndarray):
        self.joint = _pmf(lam_focus)[:, :, None] * _pmf(lam_opp)[:, None, :]  # (N, K, K)
        k = MAX_GOALS + 1
        diff = np.subtract.outer(np.arange(k), np.arange(k))  # a - b
        # margem a - b em índices 0..2K-2 (deslocada de K-1)
        self.margin = np.stack([self.joint[:, diff == m].sum(axis=1) for m in range(-(k - 1), k)], axis=1)
        self.offset = k - 1

    def p_margin_at_least(self, t: int) -> np.ndarray:
        """(N,) P(margem >= t), t pode passar dos limites."""
        i = t + self.offset
        if i <= 0:
            return np.ones(self.margin.shape[0])
        if i >= self.margin.shape[1]:
            return np.zeros(self.margin.shape[0])
        return self.margin[:, i:].sum(axis=1)

    def p_margin(self, m: int) -> np.ndarray:
        i = m + self.offset
        if i < 0 or i >= self.margin.shape[1]:
            return np.zeros(self.margin.shape[0])
        return self.margin[:, i]


def _need(margin_so_far: int, better: bool) -> int:
    """Margem mínima que falta no(s) jogo(s) seguinte(s) para passar: total > 0, ou = 0 com a melhor campanha."""
    return -margin_so_far + (0 if better else 1)


def _legs_for(playoff_matches: list[PlayoffMatch], a: str, b: str) -> list[PlayoffMatch]:
    return sorted((m for m in playoff_matches if {m.home_id, m.away_id} == {a, b}), key=lambda m: m.kickoff_utc)


def _aggregate(legs: list[PlayoffMatch], team: str) -> tuple[int, int] | None:
    done = [m for m in legs if m.status == "finished" and m.home_goals is not None and m.away_goals is not None]
    if not done:
        return None
    gf = sum(m.home_goals if m.home_id == team else m.away_goals for m in done)
    ga = sum(m.away_goals if m.home_id == team else m.home_goals for m in done)
    return gf, ga


def _leg_dists(model: ModelInput, team: str, opp: str, better: bool, rng: np.random.Generator):
    """Distribuição de placar da ida e da volta na visão de `team` (a pior campanha manda a ida)."""
    idx = {t: i for i, t in enumerate(model.teams)}
    b, w = (idx[team], idx[opp]) if better else (idx[opp], idx[team])
    factors = draw_factors(model.ratings, N_DRAWS, rng, PARAM_UNCERTAINTY)
    lam_h, lam_a = factors.lambdas(np.array([w, b]), np.array([b, w]))  # (N ou 1, 2): ida, volta
    if better:  # visitante na ida, mandante na volta
        return LegDist(lam_a[:, 0], lam_h[:, 0]), LegDist(lam_h[:, 1], lam_a[:, 1])
    return LegDist(lam_h[:, 0], lam_a[:, 0]), LegDist(lam_a[:, 1], lam_h[:, 1])


def tie_chance(model: ModelInput, team: str, opp: str, better: bool, played: list[int], rng) -> tuple[float, float]:
    """(chance de `team` passar agora, chance antes da ida). `played` = margens de `team` nos jogos já disputados."""
    d1, d2 = _leg_dists(model, team, opp, better, rng)
    start = _start_chance(d1, d2, better)
    if len(played) >= 2:
        total = sum(played)
        now = 1.0 if total > 0 or (total == 0 and better) else 0.0
    elif len(played) == 1:
        now = float(d2.p_margin_at_least(_need(played[0], better)).mean())
    else:
        now = start
    return now, start


def _start_chance(d1: LegDist, d2: LegDist, better: bool) -> float:
    total = np.zeros(d1.margin.shape[0])
    for i in range(d1.margin.shape[1]):
        m1 = i - d1.offset
        total += d1.margin[:, i] * d2.p_margin_at_least(_need(m1, better))
    return float(total.mean())


def _tape_side(team: str, row: StandingRow, matches: list[Match], details: dict[str, MatchDetails],
               expected: float) -> TapeSide:
    parts = compute_xray_parts(matches, details, team)
    done = team_matches(finished(matches), team)
    gf_ga = [goals(m, team) for m in done]
    bins = parts["goal_bins"]
    late = next((b for b in bins if b.label.startswith("76")), None) if bins else None
    halves = parts["halves"]
    res = [result(m, team) for m in done]
    last10 = sum({"V": 3, "E": 1, "D": 0}[r] for r in res[-10:])
    streaks = compute_streaks(matches, team)
    return TapeSide(
        team_id=team, position=row.position, points=row.points, played=row.played, wins=row.wins,
        draws=row.draws, losses=row.losses, goals_for=row.goals_for, goals_against=row.goals_against,
        home=parts["home"], away=parts["away"],
        clean_sheets=sum(1 for _, ga in gf_ga if ga == 0),
        failed_to_score=sum(1 for gf, _ in gf_ga if gf == 0),
        late_goals_for=late.goals_for if late else None,
        late_goals_against=late.goals_against if late else None,
        second_half_for=halves.second_for if halves else None,
        second_half_against=halves.second_against if halves else None,
        last10_points=last10, form=res[-5:], longest_unbeaten=streaks.longest_unbeaten,
        expected_goals=round(expected, 2),
    )


def _leg_out(m: PlayoffMatch, leg: int, matches: list[Match]) -> PlayoffLeg:
    venue, city, guessed = m.venue, m.city, False
    if not venue:
        venue, city = usual_venue(matches, m.home_id)
        guessed = venue is not None
    return PlayoffLeg(
        match_id=m.id, leg=leg, kickoff_utc=m.kickoff_utc, status=m.status, home_id=m.home_id, away_id=m.away_id,
        home_goals=m.home_goals, away_goals=m.away_goals, venue=venue, city=city, venue_guessed=guessed,
    )


def compute_playoffs(
    standings: list[StandingRow],
    matches: list[Match],
    playoff_matches: list[PlayoffMatch],
    details: dict[str, MatchDetails],
    model: ModelInput,
    focus: str = FORTALEZA_ID,
) -> Playoffs | None:
    """Só depois de a tabela fechar (todos os jogos dos pontos corridos encerrados)."""
    if not matches or any(m.status != "finished" for m in matches):
        return None
    at = {r.position: r for r in standings}
    n_done = sum(1 for m in playoff_matches if m.status == "finished")
    seed = 39_000 + n_done
    ties: list[PlayoffTie] = []
    focus_tie: FocusTie | None = None
    state = "upcoming"

    for i, (bp, wp) in enumerate(PAIRS):
        better, worse = at[bp].team_id, at[wp].team_id
        legs = _legs_for(playoff_matches, better, worse)
        agg = _aggregate(legs, better)
        margins_better = [
            (m.home_goals - m.away_goals) * (1 if m.home_id == better else -1)
            for m in legs if m.status == "finished" and m.home_goals is not None and m.away_goals is not None
        ]
        rng = np.random.default_rng([seed, i])
        p_better, _ = tie_chance(model, better, worse, True, margins_better, rng)
        winner = None
        if len(margins_better) >= 2:
            winner = better if p_better == 1.0 else worse
        ties.append(PlayoffTie(
            better_id=better, worse_id=worse, better_position=bp, worse_position=wp,
            legs=[_leg_out(m, k + 1, matches) for k, m in enumerate(legs)],
            aggregate_better=agg[0] if agg else None, aggregate_worse=agg[1] if agg else None,
            winner_id=winner, p_better=_r(p_better),
        ))
        if focus in (better, worse):
            is_better = focus == better
            opp = worse if is_better else better
            margins_focus = [m if is_better else -m for m in margins_better]
            focus_tie = _focus_tie(model, matches, details, standings, focus, opp, is_better, margins_focus,
                                   np.random.default_rng([seed, 10 + i]))
            state = "finished" if len(margins_focus) >= 2 else "between_legs" if margins_focus else "upcoming"

    return Playoffs(state=state, n_draws=N_DRAWS, seed=seed, ties=ties, focus=focus_tie)


def _focus_tie(model: ModelInput, matches: list[Match], details: dict[str, MatchDetails],
               standings: list[StandingRow], team: str, opp: str, better: bool, played: list[int],
               rng: np.random.Generator) -> FocusTie:
    d1, d2 = _leg_dists(model, team, opp, better, rng)
    start = _start_chance(d1, d2, better)
    row = {r.team_id: r for r in standings}
    h2h = [
        H2HGame(round=m.round, kickoff_utc=m.kickoff_utc, home_id=m.home_id, away_id=m.away_id,
                home_goals=m.home_goals, away_goals=m.away_goals)
        for m in finished(matches) if {m.home_id, m.away_id} == {team, opp}
    ]
    next_leg = None if len(played) >= 2 else len(played) + 1
    margins: list[MarginRow] = []
    scores: list[ScoreCell] = []
    chances = None
    if next_leg is None:
        total = sum(played)
        now = 1.0 if total > 0 or (total == 0 and better) else 0.0
        dist = d2
    else:
        dist = d1 if next_leg == 1 else d2
        so_far = sum(played)

        def adv_given(m: int) -> np.ndarray:
            """(N,) chance de passar se o próximo jogo terminar com margem m."""
            if next_leg == 1:
                return d2.p_margin_at_least(_need(m, better))
            t = so_far + m
            return np.full(dist.margin.shape[0], 1.0 if t > 0 or (t == 0 and better) else 0.0)

        now = start if next_leg == 1 else float(d2.p_margin_at_least(_need(so_far, better)).mean())
        for m in range(-MARGIN_CAP, MARGIN_CAP + 1):
            if m == -MARGIN_CAP:
                group = range(-MAX_GOALS, -MARGIN_CAP + 1)
            elif m == MARGIN_CAP:
                group = range(MARGIN_CAP, MAX_GOALS + 1)
            else:
                group = [m]
            p_n = sum(dist.p_margin(x) for x in group)
            both = sum(dist.p_margin(x) * adv_given(x) for x in group)
            p = float(p_n.mean())
            margins.append(MarginRow(margin=m, p=_r(p), p_advance=_r(float(both.mean()) / p) if p > 0 else 0.0))
        for a in range(GRID_GOALS + 1):
            for b in range(GRID_GOALS + 1):
                cell = dist.joint[:, a, b]
                p = float(cell.mean())
                p_adv = float((cell * adv_given(a - b)).mean()) / p if p > 0 else 0.0
                scores.append(ScoreCell(focus_goals=a, opponent_goals=b, p=_r(p), p_advance=_r(p_adv)))
        win = float(dist.p_margin_at_least(1).mean())
        draw = float(dist.p_margin(0).mean())
        chances = MatchChances(win=_r(win), draw=_r(draw), loss=_r(1 - win - draw))

    # gols esperados no próximo jogo (ou na volta, com o confronto encerrado)
    k = np.arange(MAX_GOALS + 1)
    exp_team = float((dist.joint.sum(axis=2) * k).sum(axis=1).mean())
    exp_opp = float((dist.joint.sum(axis=1) * k).sum(axis=1).mean())
    return FocusTie(
        opponent_id=opp, better=better, next_leg=next_leg, p_advance=_r(now), p_advance_start=_r(start),
        leg_chances=chances, margins=margins, scores=scores, head_to_head=h2h,
        focus=_tape_side(team, row[team], matches, details, exp_team),
        opponent=_tape_side(opp, row[opp], matches, details, exp_opp),
    )


def playoff_next_match(po: Playoffs, matches: list[Match], focus: str = FORTALEZA_ID) -> NextMatch | None:
    """Próximo jogo do Leão no mata-mata, no formato do card do topo (rodada = 38 + jogo)."""
    if po.focus is None or po.focus.next_leg is None:
        return None
    tie = next(t for t in po.ties if focus in (t.better_id, t.worse_id))
    leg = next((x for x in tie.legs if x.leg == po.focus.next_leg), None)
    if leg is None:
        return None
    opp = po.focus.opponent_id
    return NextMatch(
        match_id=leg.match_id, round=TOTAL_ROUNDS + leg.leg, kickoff_utc=leg.kickoff_utc, status=leg.status,
        home=leg.home_id == focus, opponent_id=opp, venue=leg.venue, city=leg.city, first_turn=None,
        form_fortaleza=form(matches, focus), form_opponent=form(matches, opp), chances=po.focus.leg_chances,
        leg=leg.leg, venue_guessed=leg.venue_guessed,
    )

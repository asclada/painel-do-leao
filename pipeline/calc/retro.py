"""Retrospectiva da campanha nos pontos corridos: os momentos que contam a história da temporada.

Tudo sai dos dados (linha do tempo, chances rodada a rodada do backtest e a tabela de cada rodada), menos a troca de
técnico, que vem dos marcos manuais confirmados (data/manual/milestones.json). Só existe com a tabela fechada.

"Chance de G6" aqui é a de terminar entre os 6 primeiros (acesso direto + playoffs), a medida que faz sentido para
a temporada inteira: no começo do campeonato o Leão ainda brigava pelo G2.
"""

from __future__ import annotations

from pipeline.calc.clinch import compute_clinch
from pipeline.calc.common import parse_dt, plural
from pipeline.calc.milestones import load_manual
from pipeline.calc.standings import compute_standings
from pipeline.calc.timeline import round_cutoff
from pipeline.config import TOTAL_ROUNDS
from pipeline.models import Match, Team
from pipeline.outputs import HistoryEntry, Retro, RetroMoment, TimelinePoint

WORST_FROM_ROUND = 10  # antes disso a chance mexe muito com poucos jogos: o "pior momento" conta a partir daqui
MIN_RUN = 5  # sequência sem perder que vira momento


def _pct(p: float) -> str:
    v = 100 * p
    if 0 < v < 1:
        return "menos de 1%"
    if 99 < v < 100:
        return "mais de 99%"
    return f"{round(v)}%"


def _score(p: TimelinePoint, names: dict[str, str]) -> str:
    opp = names.get(p.opponent_id or "", p.opponent_id or "")
    if p.home:
        return f"Fortaleza {p.goals_for} x {p.goals_against} {opp}"
    return f"{opp} {p.goals_against} x {p.goals_for} Fortaleza"


def clinch_round(team: str, teams: list[Team], matches: list[Match], kind: str = "g6") -> int | None:
    """Primeira rodada depois da qual a vaga (G6) ficou garantida na matemática."""
    done = [m for m in matches if m.status == "finished"]
    for r in range(1, TOTAL_ROUNDS + 1):
        cut = round_cutoff(matches, r)
        if cut is None:
            continue
        subset = [m for m in done if parse_dt(m.kickoff_utc) <= parse_dt(cut)]
        status = getattr(compute_clinch(compute_standings(teams, subset))[team], kind)
        if status == "clinched":
            return r
    return None


def compute_retro(
    team: str,
    teams: list[Team],
    matches: list[Match],
    points: list[TimelinePoint],
    history: list[HistoryEntry],
    names: dict[str, str],
) -> Retro | None:
    if not matches or any(m.status != "finished" for m in matches) or not points or not history:
        return None
    g6 = {h.round: min(1.0, h.p_direct + h.p_top6) for h in history}
    pos = {p.round: p.position for p in points}
    played = [p for p in points if p.result]
    moments: list[RetroMoment] = []

    def add(kind: str, rnd: int, title: str, text: str) -> None:
        moments.append(RetroMoment(kind=kind, round=rnd, title=title, text=text,
                                   p_g6=round(g6[rnd], 4) if rnd in g6 else None, position=pos.get(rnd, 0)))

    first = played[0]
    add("start", first.round, "A largada",
        f"Rodada {first.round}: {_score(first, names)}. O Leão saiu em {first.position}º, com "
        f"{_pct(g6.get(first.round, 0))} de chance de terminar no G6.")

    # pior posição da rodada 10 em diante (empate: a de menor chance de G6)
    late = [p for p in points if p.round >= WORST_FROM_ROUND and p.round in g6]
    if late:
        worst = max(late, key=lambda p: (p.position, -g6[p.round]))
        out_of_g6 = "fora do G6, " if worst.position > 6 else ""
        add("worst", worst.round, "O pior momento",
            f"Depois da rodada {worst.round}, o Leão estava em {worst.position}º, {out_of_g6}com "
            f"{plural(worst.points, 'ponto')}. A chance de terminar no G6 era de {_pct(g6[worst.round])}.")

    for m in load_manual():
        if m.round in pos and m.round > 1 and (m.round - 1) in g6:
            add("coach", m.round, m.title,
                f"{m.text} Antes dele, a chance de G6 estava em {_pct(g6[m.round - 1])}.")

    # maior sequência sem perder
    best_len, best_end, cur = 0, None, 0
    for p in played:
        cur = cur + 1 if p.result != "D" else 0
        if cur > best_len:
            best_len, best_end = cur, p.round
    if best_len >= MIN_RUN and best_end is not None:
        rounds = [p.round for p in played]
        start = rounds[rounds.index(best_end) - best_len + 1]
        before = g6.get(start - 1)
        after = g6.get(best_end)
        swing = f" A chance de G6 foi de {_pct(before)} para {_pct(after)}." if before is not None and after is not None else ""
        add("run", best_end, f"{plural(best_len, 'jogo')} sem perder",
            f"Das rodadas {start} a {best_end}, a maior sequência invicta da campanha.{swing}")

    clinched = clinch_round(team, teams, matches)
    if clinched is not None:
        add("clinch", clinched, "Vaga garantida",
            f"Depois da rodada {clinched}, a vaga no G6 ficou garantida na matemática, sem depender de "
            f"nenhuma conta do modelo.")

    wins = [p for p in played if p.result == "V"]
    if wins:
        big = max(wins, key=lambda p: (p.goals_for - p.goals_against, p.goals_for, -p.round))
        add("biggest_win", big.round, "A maior vitória", f"Rodada {big.round}: {_score(big, names)}.")

    last = played[-1]
    add("final", last.round, "Fim dos pontos corridos",
        f"Rodada {last.round}: {_score(last, names)}. O Leão terminou em {last.position}º, com "
        f"{plural(last.points, 'ponto')}.")

    moments.sort(key=lambda mo: mo.round)  # estável: na mesma rodada, a ordem acima

    best = min(points, key=lambda p: (p.position, p.round))
    worst_pos = max((p for p in points if p.round >= WORST_FROM_ROUND), key=lambda p: (p.position, p.round),
                    default=None)
    in_g6 = sum(1 for p in points if p.position <= 6)
    return Retro(
        moments=moments,
        best_position=best.position, best_position_round=best.round,
        worst_position=worst_pos.position if worst_pos else best.position,
        worst_position_round=worst_pos.round if worst_pos else best.round,
        rounds_in_g6=in_g6, rounds=len(points),
        longest_unbeaten=best_len, clinch_round=clinched,
    )

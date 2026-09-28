"""Marcos da temporada: automáticos + manuais (data/manual/milestones.json).

Máximo de 6 visíveis. Prioridade: manuais > G2 > pior posição > invencibilidade > G6 > resto.
"""

from __future__ import annotations

import json

from pipeline.calc.common import plural
from pipeline.config import MANUAL
from pipeline.outputs import Milestone, TimelinePoint

MAX_VISIBLE = 6
PRIORITY = {"manual": 0, "g2": 1, "worst": 2, "unbeaten": 3, "g6": 4, "biggest_win": 5, "first_turn": 6}


def _score(p: TimelinePoint, names: dict[str, str]) -> str:
    opp = names.get(p.opponent_id or "", p.opponent_id or "")
    if p.home:
        return f"Fortaleza {p.goals_for} x {p.goals_against} {opp}"
    return f"{opp} {p.goals_against} x {p.goals_for} Fortaleza"


def auto_milestones(points: list[TimelinePoint], names: dict[str, str]) -> list[Milestone]:
    if not points:
        return []
    out: list[Milestone] = []

    worst = max(points, key=lambda p: (p.position, -p.round))
    where = "Lanterna" if worst.position == 20 else f"{worst.position}º lugar"
    when = "após a estreia" if worst.round == 1 else f"na rodada {worst.round}"
    score = f"{_score(worst, names)}. " if worst.result else ""
    out.append(Milestone(round=worst.round, kind="worst", title=f"{where} {when}",
                         text=f"Rodada {worst.round}: {score}{where}, a pior posição da campanha."))

    g6 = next((p for p in points if p.position <= 6), None)
    if g6 and g6.round != worst.round:
        out.append(Milestone(round=g6.round, kind="g6", title="Entrou no G6",
                             text=f"Rodada {g6.round}: primeira vez na zona dos playoffs ({g6.position}º)."))
    g2 = next((p for p in points if p.position <= 2), None)
    if g2:
        out.append(Milestone(round=g2.round, kind="g2", title="Chegou ao G2",
                             text=f"Rodada {g2.round}: primeira vez na zona de acesso direto ({g2.position}º)."))

    # início da invencibilidade atual (>= 5 jogos)
    played = [p for p in points if p.result]
    run = 0
    for p in reversed(played):
        if p.result == "D":
            break
        run += 1
    if run >= 5:
        start = played[-run]
        out.append(Milestone(round=start.round, kind="unbeaten", title="Começa a invencibilidade",
                             text=f"Rodada {start.round}: início da sequência de {plural(run, 'jogo')} sem perder."))

    wins = [p for p in played if p.result == "V"]
    if wins:
        big = max(wins, key=lambda p: (p.goals_for - p.goals_against, p.goals_for, -p.round))
        if big.goals_for - big.goals_against >= 3:
            out.append(Milestone(round=big.round, kind="biggest_win", title="Maior goleada",
                                 text=f"Rodada {big.round}: {_score(big, names)}."))

    ft = next((p for p in points if p.round == 19), None)
    if ft:
        out.append(Milestone(round=19, kind="first_turn", title="Fim do 1º turno",
                             text=f"Fim do 1º turno: {ft.position}º com {ft.points} pontos."))
    return out


def load_manual() -> list[Milestone]:
    f = MANUAL / "milestones.json"
    if not f.exists():
        return []
    raw = json.loads(f.read_text(encoding="utf-8"))
    return [
        Milestone(round=m["round"], kind="manual", title=m["title"], text=m["text"])
        for m in raw
        if m.get("confirmed", False) or m.get("showUnconfirmed", False)
    ]


def select_milestones(auto: list[Milestone], manual: list[Milestone], last_round: int) -> list[Milestone]:
    allm = [m for m in manual + auto if m.round <= last_round]
    chosen: list[Milestone] = []
    by_round: dict[int, Milestone] = {}
    for m in sorted(allm, key=lambda m: PRIORITY.get(m.kind, 9)):
        if m.round in by_round:
            # um marco por rodada; a invencibilidade vira complemento do marco que já está lá
            if m.kind == "unbeaten":
                kept = by_round[m.round]
                seq = m.text.split(": ", 1)[-1].replace("início da", "Ali começou a")
                kept.text = f"{kept.text} {seq}"
            continue
        chosen.append(m)
        by_round[m.round] = m
        if len(chosen) == MAX_VISIBLE:
            break
    return sorted(chosen, key=lambda m: m.round)


def headline(points: list[TimelinePoint]) -> str:
    if not points:
        return "A temporada ainda não começou."
    now = points[-1]
    worst = max(points, key=lambda p: (p.position, -p.round))
    best = min(points, key=lambda p: (p.position, p.round))
    if worst.round < now.round and now.position < worst.position:
        start = "Da lanterna" if worst.position == 20 else f"Do {worst.position}º lugar"
        when = "na estreia" if worst.round == 1 else f"na rodada {worst.round}"
        climb = worst.position - now.position
        return f"{start} {when} ao {now.position}º lugar: {plural(climb, 'posição escalada', 'posições escaladas')}."
    if best.round < now.round and now.position > best.position:
        return f"Do {best.position}º lugar na rodada {best.round} ao {now.position}º hoje."
    return f"{now.position}º lugar depois de {plural(now.round, 'rodada')}."

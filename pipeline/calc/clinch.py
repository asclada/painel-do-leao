"""Garantido ou eliminado na matemática (não na simulação).

A simulação pode dar 100% (ou 0%) sem que a vaga esteja garantida: é só uma combinação improvável que não
apareceu nas 20 mil temporadas. Aqui a conta é de pontos, sem sorteio:

- garantido no top k: no máximo k-1 outros times ainda conseguem chegar aos pontos que o time JÁ tem
  (empate em pontos conta como "pode passar", porque o desempate ainda está em aberto);
- eliminado do top k: pelo menos k times JÁ têm mais pontos do que o máximo que o time ainda consegue fazer.

É conservador: não considera que dois rivais que se enfrentam não podem vencer os dois. Pode demorar uma rodada
a mais para dizer "garantido", mas nunca diz "garantido" sem estar.
Com a fase de pontos corridos encerrada, vale a posição final da tabela.
"""

from __future__ import annotations

from typing import Literal

from pipeline.config import TOTAL_ROUNDS
from pipeline.models import Model, StandingRow

Status = Literal["clinched", "eliminated", "open"]


class Clinch(Model):
    direct: Status  # 1º ou 2º (acesso direto)
    g6: Status  # 1º ao 6º (acesso direto ou playoffs)
    top16: Status  # fora do Z4: "clinched" = livre do rebaixamento; "eliminated" = rebaixado


def _status(me: StandingRow, others: list[StandingRow], k: int, finished: bool) -> Status:
    if finished:
        return "clinched" if me.position <= k else "eliminated"
    my_max = me.points + 3 * (TOTAL_ROUNDS - me.played)
    can_reach_me = sum(1 for o in others if o.points + 3 * (TOTAL_ROUNDS - o.played) >= me.points)
    if can_reach_me <= k - 1:
        return "clinched"
    already_above = sum(1 for o in others if o.points > my_max)
    if already_above >= k:
        return "eliminated"
    return "open"


def compute_clinch(standings: list[StandingRow]) -> dict[str, Clinch]:
    finished = all(r.played == TOTAL_ROUNDS for r in standings)
    out = {}
    for me in standings:
        others = [o for o in standings if o.team_id != me.team_id]
        out[me.team_id] = Clinch(
            direct=_status(me, others, 2, finished),
            g6=_status(me, others, 6, finished),
            top16=_status(me, others, 16, finished),
        )
    return out

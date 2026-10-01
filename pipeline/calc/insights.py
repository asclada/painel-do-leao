"""Frases de destaque por regras (sem IA): cada bloco mostra a regra de maior prioridade que se aplica."""

from __future__ import annotations

from pipeline.calc.common import local_date, plural
from pipeline.outputs import GoalBin, HalfSplit, Streaks, TurnSplit, VenueSplit


def _fmt1(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def venue_insight(home: VenueSplit, away: VenueSplit) -> str:
    if home.pct - away.pct >= 15:
        return f"No Castelão o Leão é outro: {home.pct}% dos pontos em casa contra {away.pct}% fora."
    if away.pct >= home.pct:
        return f"Fora de casa o time rende tão bem quanto no Castelão: {away.pct}% dos pontos longe de casa."
    return f"Em casa, {home.pct}% dos pontos; fora, {away.pct}%. Campanha equilibrada nos dois mandos."


def halves_insight(h: HalfSplit) -> str:
    total = h.first_for + h.second_for
    if total and h.pct_second_half_for >= 60:
        return f"Time de segundo tempo: {h.pct_second_half_for}% dos gols saíram depois do intervalo."
    if total and 100 - h.pct_second_half_for >= 60:
        return f"O Leão resolve cedo: {100 - h.pct_second_half_for}% dos gols vieram no 1º tempo."
    s1, s2 = h.first_for - h.first_against, h.second_for - h.second_against
    if s1 == s2:
        return f"Saldo de {s1:+d} no 1º tempo e {s2:+d} no 2º: equilíbrio entre os dois tempos."
    better = "1º" if s1 > s2 else "2º"
    return f"Saldo de {s1:+d} no 1º tempo e {s2:+d} no 2º: o {better} tempo é o mais forte."


def bins_insight(bins: list[GoalBin]) -> str:
    total_for = sum(b.goals_for for b in bins)
    top_for = max(bins, key=lambda b: b.goals_for)
    top_against = max(bins, key=lambda b: b.goals_against)
    if top_for.label == "76–90+" and total_for and top_for.goals_for / total_for >= 0.25:
        return f"Reta final é com a gente: {plural(top_for.goals_for, 'gol')} nos últimos 15 minutos."
    if top_against.goals_against > top_for.goals_for:
        return f"O ponto de atenção: {plural(top_against.goals_against, 'gol sofrido', 'gols sofridos')} entre {top_against.label} minutos."
    return f"A faixa mais forte é {top_for.label} minutos, com {plural(top_for.goals_for, 'gol')}."


def turn_insight(t1: TurnSplit, t2: TurnSplit) -> str:
    if t2.played and t2.ppg - t1.ppg >= 0.4:
        return f"O returno é outro campeonato: {_fmt1(t2.ppg)} pontos por jogo contra {_fmt1(t1.ppg)} no 1º turno."
    if t2.played and t1.ppg - t2.ppg >= 0.4:
        return f"O returno está abaixo do 1º turno: {_fmt1(t2.ppg)} pontos por jogo contra {_fmt1(t1.ppg)}."
    return f"Ritmo parecido nos dois turnos: {_fmt1(t1.ppg)} e {_fmt1(t2.ppg)} pontos por jogo."


def streak_insight(s: Streaks, names: dict[str, str]) -> str:
    if s.current_kind == "unbeaten" and s.current_count >= 5 and s.last_loss_date:
        opp = names.get(s.last_loss_opponent_id or "", "")
        return f"{plural(s.current_count, 'jogo')} sem perder. Última derrota: {opp}, em {local_date(s.last_loss_date)}."
    if s.clean_sheets >= 8:
        return f"{plural(s.clean_sheets, 'jogo')} sem ser vazado na Série B."
    return f"Maior sequência invicta da temporada: {plural(s.longest_unbeaten, 'jogo')}."

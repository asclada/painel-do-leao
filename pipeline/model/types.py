"""Formato do data/model.json: tudo que a simulação precisa, sem depender do pipeline."""

from __future__ import annotations

from pipeline.models import Model


class GammaPosterior(Model):
    """Posteriori Gamma(forma, taxa) de um fator por time (média = forma / taxa = o fator pontual)."""

    shape: list[float]
    rate: list[float]


class Ratings(Model):
    mu_home: float
    mu_away: float
    att_home: list[float]
    def_home: list[float]
    att_away: list[float]
    def_away: list[float]
    strength: list[float]
    # Distribuição preditiva bayesiana: posteriori de cada fator (chaves att_home, def_home, att_away, def_away).
    # Sem ela, a simulação usa só os fatores pontuais (modelo antigo).
    posterior: dict[str, GammaPosterior] | None = None


class TableState(Model):
    points: list[int]
    wins: list[int]
    goal_diff: list[int]
    goals_for: list[int]
    # Critérios depois de gols pró (regulamento): confronto direto e cartões. Opcionais: sem eles, a simulação
    # desempata só pelos quatro primeiros critérios e sorteio (formato antigo do model.json).
    h2h_points: list[list[int]] | None = None  # [i][j] = pontos de i contra j nos jogos já disputados
    h2h_goal_diff: list[list[int]] | None = None  # [i][j] = saldo de i contra j nos jogos já disputados
    red: list[int] | None = None  # cartões até agora (a simulação não prevê cartões: é uma aproximação)
    yellow: list[int] | None = None


class RemainingMatch(Model):
    id: str
    round: int
    kickoff_utc: str
    home: int  # índice em `teams`
    away: int


class ModelInput(Model):
    season: int
    last_completed_round: int
    teams: list[str]  # ids, na ordem dos índices
    focus_team: int  # índice do Fortaleza
    table: TableState
    ratings: Ratings
    remaining: list[RemainingMatch]  # ordenados por data
    focus_remaining: list[int]  # índices em `remaining` dos jogos do Fortaleza, em ordem cronológica

"""Formato do data/model.json: tudo que a simulação precisa, sem depender do pipeline."""

from __future__ import annotations

from pipeline.models import Model


class Ratings(Model):
    mu_home: float
    mu_away: float
    att_home: list[float]
    def_home: list[float]
    att_away: list[float]
    def_away: list[float]
    strength: list[float]


class TableState(Model):
    points: list[int]
    wins: list[int]
    goal_diff: list[int]
    goals_for: list[int]


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

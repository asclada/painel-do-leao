"""Modelos dos JSON lidos pelo site (viram tipos TypeScript via `pnpm gen:types`)."""

from __future__ import annotations

from typing import Literal

from pipeline.calc.calibration import Calibration
from pipeline.calc.key_games import KeyGames
from pipeline.model.summarize import MagicNumbers, PointsDist, TeamOdds
from pipeline.models import Model, StandingRow, Team

Result = Literal["V", "E", "D"]


class DataStatus(Model):
    """Saúde da fonte: `delayed` quando a ESPN falha seguidamente e há jogo encerrado sem resultado."""

    delayed: bool = False
    last_success_at: str | None = None  # última consulta que deu certo (ESPN ou reserva)


class Meta(Model):
    season: int
    fortaleza_id: str
    last_completed_round: int
    provider: str | None
    has_goal_minutes: bool
    has_half_time: bool
    season_state: Literal["regular", "playoffs", "finished"]
    updated_at: str | None
    data_status: DataStatus = DataStatus()


# --- Linha do tempo (F2) --------------------------------------------------------


class TimelinePoint(Model):
    round: int
    position: int
    points: int
    result: Result | None = None
    match_id: str | None = None
    opponent_id: str | None = None
    home: bool | None = None
    goals_for: int | None = None
    goals_against: int | None = None
    kickoff_utc: str | None = None


class Milestone(Model):
    round: int
    kind: str  # manual, worst, g2, g6, unbeaten, biggest_win, first_turn
    title: str
    text: str


class Timeline(Model):
    team_id: str
    points: list[TimelinePoint]
    rivals: dict[str, list[int]]  # time -> posição por rodada (para as linhas finas)
    milestones: list[Milestone]
    headline: str


# --- Sequências e raio-x (F5) ------------------------------------------------------


class Streaks(Model):
    current_kind: Literal["wins", "unbeaten", "winless", "losses", "none"]
    current_count: int
    current_label: str
    longest_unbeaten: int
    longest_wins: int
    clean_sheets: int
    longest_clean_sheets: int
    form: list[Result]  # últimos 5, do mais antigo ao mais recente
    last_loss_date: str | None = None
    last_loss_opponent_id: str | None = None


class VenueSplit(Model):
    played: int
    wins: int
    draws: int
    losses: int
    points: int
    pct: int
    goals_for: int
    goals_against: int


class HalfSplit(Model):
    first_for: int
    first_against: int
    second_for: int
    second_against: int
    pct_second_half_for: int
    # O que muda depois do intervalo: resultado final comparado com o placar do intervalo
    improved: int = 0  # jogos em que terminou melhor (ex.: perdia e empatou)
    worsened: int = 0
    kept: int = 0
    points_swing: int = 0  # pontos finais menos os pontos que teria se o jogo acabasse no intervalo


class GoalBin(Model):
    label: str  # "1–15"
    goals_for: int
    goals_against: int


class TurnSplit(Model):
    played: int
    points: int
    ppg: float
    pct: int


class XRay(Model):
    home: VenueSplit
    away: VenueSplit
    halves: HalfSplit | None
    goal_bins: list[GoalBin] | None
    first_turn: TurnSplit
    second_turn: TurnSplit
    streaks: Streaks
    insights: dict[str, str]  # bloco -> frase de destaque


# --- Corrida (F3) ------------------------------------------------------------------


class RaceFixture(Model):
    match_id: str
    round: int
    kickoff_utc: str
    opponent_id: str
    home: bool
    opponent_in_top6: bool


class RaceTeam(Model):
    team_id: str
    position: int
    points: int
    played: int
    goal_diff: int
    form: list[Result]
    remaining_home: int
    remaining_away: int
    remaining_vs_top6: int
    difficulty: Literal["Difícil", "Média", "Tranquila"]
    difficulty_score: float
    p_direct: float
    p_top6: float
    p_promotion: float
    fixtures: list[RaceFixture]


class HeadToHead(Model):
    match_id: str
    round: int
    kickoff_utc: str
    home_id: str
    away_id: str
    venue: str | None


class Race(Model):
    teams: list[RaceTeam]
    head_to_head: list[HeadToHead]
    headline: str


# --- Próximo jogo (F1) ----------------------------------------------------------------


class NextMatch(Model):
    match_id: str
    round: int
    kickoff_utc: str
    status: str
    home: bool
    opponent_id: str
    venue: str | None
    city: str | None
    first_turn: str | None  # "Fortaleza 2 x 1 Náutico"
    form_fortaleza: list[Result]
    form_opponent: list[Result]


# --- Simulação --------------------------------------------------------------------


class Simulation(Model):
    n_sims: int
    seed: int
    teams: list[TeamOdds]
    magic: MagicNumbers
    focus_points: PointsDist  # pontos finais do Fortaleza, para a "faixa mais provável"


class HistoryEntry(Model):
    """Chance do Fortaleza depois de cada rodada (backtest). A última entrada é sempre a chance de agora:
    `partial` = rodada ainda em andamento (há jogos dela, ou de depois, já disputados)."""

    round: int
    p_promotion: float
    p_direct: float
    p_top6: float
    position: int
    points: int
    partial: bool = False


class Outputs(Model):
    """Agrupa tudo só para exportar o JSON Schema."""

    meta: Meta
    teams: list[Team]
    standings: list[StandingRow]
    timeline: Timeline
    xray: XRay
    race: Race
    next_match: NextMatch | None
    simulation: Simulation
    history: list[HistoryEntry]
    key_games: KeyGames
    calibration: Calibration

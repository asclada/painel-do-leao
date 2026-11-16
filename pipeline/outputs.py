"""Modelos dos JSON lidos pelo site (viram tipos TypeScript via `pnpm gen:types`)."""

from __future__ import annotations

from typing import Literal

from pipeline.calc.calibration import Calibration
from pipeline.calc.clinch import Clinch
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
    # pontos a mais (+) ou a menos (−) que um time médio faria nos jogos que faltam, comparado com uma tabela média
    schedule_points: float
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


class MatchChances(Model):
    """Chance de cada resultado de um jogo, na visão do Fortaleza (mesmo modelo da simulação)."""

    win: float
    draw: float
    loss: float


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
    chances: MatchChances | None = None
    # playoffs: 1 = ida, 2 = volta (round = 38 + leg, numeração usada pelo palpite); None nos pontos corridos
    leg: int | None = None
    venue_guessed: bool = False  # estádio ainda não confirmado pela ESPN (o mais usado pelo mandante)


# --- Retrospectiva dos pontos corridos -------------------------------------------------


class RetroMoment(Model):
    kind: Literal["start", "worst", "coach", "run", "clinch", "biggest_win", "final"]
    round: int
    title: str
    text: str
    p_g6: float | None  # chance de terminar no G6 (1º ao 6º) depois daquela rodada
    position: int


class Retro(Model):
    moments: list[RetroMoment]
    best_position: int
    best_position_round: int
    worst_position: int  # da rodada 10 em diante
    worst_position_round: int
    rounds_in_g6: int
    rounds: int
    longest_unbeaten: int
    clinch_round: int | None  # vaga no G6 garantida na matemática


# --- Playoffs (mata-mata de ida e volta) ------------------------------------------------


class PlayoffLeg(Model):
    match_id: str  # "po-{mandante}--{visitante}"
    leg: Literal[1, 2]
    kickoff_utc: str
    status: str
    home_id: str
    away_id: str
    home_goals: int | None = None
    away_goals: int | None = None
    venue: str | None = None
    city: str | None = None
    venue_guessed: bool = False  # a ESPN ainda não informou: estádio mais usado pelo mandante na temporada


class PlayoffTie(Model):
    """Um confronto: 3º x 6º ou 4º x 5º. A melhor campanha decide em casa e passa com empate no placar somado."""

    better_id: str
    worse_id: str
    better_position: int
    worse_position: int
    legs: list[PlayoffLeg]
    aggregate_better: int | None = None  # soma dos jogos já disputados (None antes da ida)
    aggregate_worse: int | None = None
    winner_id: str | None = None
    p_better: float  # chance de a melhor campanha passar, agora


class ScoreCell(Model):
    """Um placar do próximo jogo do Leão no confronto, na visão do Leão."""

    focus_goals: int
    opponent_goals: int
    p: float  # chance de o jogo terminar assim
    p_advance: float  # chance de o Leão passar se o jogo terminar assim


class MarginRow(Model):
    """Resultado do próximo jogo pela diferença de gols (−3 = perder por 3 ou mais; +3 = vencer por 3 ou mais)."""

    margin: int
    p: float
    p_advance: float


class TapeSide(Model):
    """Raio-x de um dos times do confronto, só com os pontos corridos."""

    team_id: str
    position: int
    points: int
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    home: VenueSplit
    away: VenueSplit
    clean_sheets: int
    failed_to_score: int
    late_goals_for: int | None = None  # do minuto 76 em diante
    late_goals_against: int | None = None
    second_half_for: int | None = None
    second_half_against: int | None = None
    last10_points: int  # pontos nos últimos 10 jogos
    form: list[Result]
    longest_unbeaten: int
    expected_goals: float  # gols esperados no próximo jogo do confronto (média do modelo)


class H2HGame(Model):
    round: int
    kickoff_utc: str
    home_id: str
    away_id: str
    home_goals: int
    away_goals: int


class FocusTie(Model):
    """O confronto do Fortaleza, com as contas do próximo jogo."""

    opponent_id: str
    better: bool  # o Leão tem a melhor campanha (volta em casa, empate no placar somado é dele)
    next_leg: int | None  # 1 = ida, 2 = volta, None = confronto encerrado
    p_advance: float  # chance de o Leão passar (= subir), agora
    p_advance_start: float  # a mesma chance antes da ida (para "a conta mudou")
    leg_chances: MatchChances | None = None  # V/E/D do Leão no próximo jogo do confronto
    margins: list[MarginRow] = []
    scores: list[ScoreCell] = []  # placares de 0 a 4 gols para cada lado
    head_to_head: list[H2HGame]  # jogos dos dois nos pontos corridos
    focus: TapeSide
    opponent: TapeSide


class Playoffs(Model):
    state: Literal["upcoming", "between_legs", "finished"]  # do confronto do Leão
    n_draws: int
    seed: int
    ties: list[PlayoffTie]
    focus: FocusTie | None  # None se o Leão não está nos playoffs


# --- Simulação --------------------------------------------------------------------


class Simulation(Model):
    n_sims: int
    seed: int
    teams: list[TeamOdds]
    magic: MagicNumbers
    focus_points: PointsDist  # pontos finais do Fortaleza, para a "faixa mais provável"
    clinch: dict[str, Clinch] = {}  # garantido/eliminado na matemática, por time (pipeline/calc/clinch.py)


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
    playoffs: Playoffs | None
    retro: Retro | None

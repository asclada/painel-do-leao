"""Modelos pydantic normalizados (independentes do provedor).

Os JSON em /data usam camelCase (alias_generator); em Python, snake_case.
Importa só pydantic: pode ir para a função Python da Vercel.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

TeamId = str
MatchStatus = Literal["scheduled", "live", "finished", "postponed", "cancelled"]
ProviderName = Literal["espn", "footballsoccerapi"]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    def dump(self) -> dict:
        return self.model_dump(by_alias=True, mode="json")


class TeamAliases(Model):
    espn: str | None = None
    footballsoccerapi: str | None = None
    ge: int | None = None
    names: list[str] = []  # nomes alternativos, para casar por nome


class Team(Model):
    id: TeamId  # slug canônico, ex.: "fortaleza"
    name: str  # "Fortaleza"
    short_name: str  # "FOR"
    color: str  # cor principal do clube (fundo do badge)
    text_color: str = "#FFFFFF"  # cor da sigla sobre o badge
    article: Literal["o", "a"] = "o"  # "o Vila Nova", "a Ponte Preta"
    aliases: TeamAliases = TeamAliases()


class Match(Model):
    id: str  # canônico: "{home_id}--{away_id}" (único num turno e returno)
    round: int = Field(ge=1, le=38)
    kickoff_utc: str  # ISO 8601
    status: MatchStatus
    home_id: TeamId
    away_id: TeamId
    home_goals: int | None = None
    away_goals: int | None = None
    ht_home_goals: int | None = None
    ht_away_goals: int | None = None
    venue: str | None = None
    city: str | None = None
    source: ProviderName


class GoalEvent(Model):
    team_id: TeamId  # time que ganhou o gol (gol contra já corrigido)
    minute: int  # 1..90 (45+2 -> 45, 90+3 -> 90)
    extra: int | None = None
    period: Literal[1, 2]
    own_goal: bool = False
    penalty: bool = False


class TeamStats(Model):
    possession: float | None = None
    shots: int | None = None
    shots_on_target: int | None = None
    corners: int | None = None
    yellow: int | None = None
    red: int | None = None


class MatchDetails(Model):
    match_id: str
    goals: list[GoalEvent] = []
    goals_complete: bool = False  # True se a lista de gols fecha com o placar
    stats: dict[TeamId, TeamStats] | None = None


class SeasonData(Model):
    """O que um provedor devolve: jogos + detalhes (quando houver)."""

    provider: ProviderName
    matches: list[Match]
    details: dict[str, MatchDetails] = {}


class Record(Model):
    played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    points: int = 0


class StandingRow(Model):
    position: int
    team_id: TeamId
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int
    pct: int  # aproveitamento, 0..100
    yellow: int | None = None
    red: int | None = None
    home: Record
    away: Record


class FetchState(Model):
    """Estado persistido entre execuções (data/raw/state.json)."""

    espn_consecutive_failures: int = 0
    espn_last_error: str | None = None
    espn_last_success_at: str | None = None
    last_success_at: str | None = None  # última consulta com sucesso, de qualquer provedor
    last_provider: ProviderName | None = None
    calendar: list[str] = []  # datas (YYYYMMDD) com jogo, segundo a ESPN
    date_checked_at: dict[str, str] = {}  # YYYYMMDD -> ISO da última consulta


def match_id(home_id: TeamId, away_id: TeamId) -> str:
    return f"{home_id}--{away_id}"

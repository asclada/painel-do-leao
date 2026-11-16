from __future__ import annotations

import json
from datetime import datetime
from typing import Protocol

from pipeline.config import MANUAL, PLAYOFFS_START
from pipeline.models import SeasonData, Team


class ProviderError(Exception):
    """Falha do provedor (rede, HTTP, formato inesperado ou dados incoerentes)."""


class DataProvider(Protocol):
    name: str

    def fetch(self, dates: list[str] | None) -> SeasonData:
        """Busca jogos. `dates` (YYYYMMDD) limita a consulta quando o provedor permite;
        None = temporada inteira."""
        ...


def is_playoff_kickoff(kickoff_utc: str) -> bool:
    """Jogo da fase final? (a partir de PLAYOFFS_START, ver pipeline/config.py)"""

    def dt(s: str) -> datetime:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))

    return dt(kickoff_utc) >= dt(PLAYOFFS_START)


def load_teams() -> list[Team]:
    raw = json.loads((MANUAL / "teams.json").read_text(encoding="utf-8"))
    return [Team.model_validate(t) for t in raw]


def load_rounds() -> dict[str, int]:
    return json.loads((MANUAL / "rounds.json").read_text(encoding="utf-8"))

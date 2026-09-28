from __future__ import annotations

import json
from typing import Protocol

from pipeline.config import MANUAL
from pipeline.models import SeasonData, Team


class ProviderError(Exception):
    """Falha do provedor (rede, HTTP, formato inesperado ou dados incoerentes)."""


class DataProvider(Protocol):
    name: str

    def fetch(self, dates: list[str] | None) -> SeasonData:
        """Busca jogos. `dates` (YYYYMMDD) limita a consulta quando o provedor permite;
        None = temporada inteira."""
        ...


def load_teams() -> list[Team]:
    raw = json.loads((MANUAL / "teams.json").read_text(encoding="utf-8"))
    return [Team.model_validate(t) for t in raw]


def load_rounds() -> dict[str, int]:
    return json.loads((MANUAL / "rounds.json").read_text(encoding="utf-8"))

"""Provedor reserva: footballsoccerapi.com (plano grátis: 50 chamadas/dia).

Só o essencial: placares, placar do intervalo e horários (1 chamada por execução).
No plano grátis a listagem só alcança "ontem, hoje e os próximos jogos"; o
histórico vem do cache (ESPN). Como o cron roda a cada 2h, isso basta para não
perder nenhum resultado. Minuto dos gols e estatísticas não existem no plano grátis.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
import re
import unicodedata
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError, model_validator

from pipeline.config import FSA_BASE, FSA_LEAGUE, SEASON
from pipeline.http import PoliteClient
from pipeline.models import Match, MatchStatus, SeasonData, Team, match_id
from pipeline.providers.base import ProviderError


def norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(saf|fc|ec|esporte clube|futebol clube)\b", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


class RawFsaMatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    match_id: str
    home_team_id: str
    away_team_id: str
    home_team_name: str
    away_team_name: str
    kickoff_utc: str
    match_status: str
    home_goals: int | None = None
    away_goals: int | None = None
    half_time_home_goals: int | None = None
    half_time_away_goals: int | None = None
    venue_name: str | None = None
    city_name: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _aliases(cls, data: Any) -> Any:
        # tolera variações de nome de campo entre versões da API
        if isinstance(data, dict):
            data = dict(data)
            data.setdefault("match_id", data.get("id"))
            data.setdefault("match_status", data.get("status"))
            if "kickoff_utc" not in data:
                data["kickoff_utc"] = data.get("kickoff") or data.get("kickoff_date")
            ko = data.get("kickoff_utc")
            if isinstance(ko, (int, float)):  # a API manda timestamp Unix
                data["kickoff_utc"] = (
                    datetime.fromtimestamp(ko, tz=timezone.utc).isoformat().replace("+00:00", "Z")
                )
        return data


STATUS = {
    "finished": "finished",
    "scheduled": "scheduled",
    "postponed": "postponed",
    "cancelled": "cancelled",
    "abandoned": "cancelled",
}


class FootballSoccerApiProvider:
    name = "footballsoccerapi"

    def __init__(self, teams: list[Team], rounds: dict[str, int], key: str | None = None,
                 client: PoliteClient | None = None):
        key = key or os.environ.get("FOOTBALL_API_KEY", "").strip()
        if not key and client is None:
            raise ProviderError("FOOTBALL_API_KEY não definida (provedor reserva indisponível)")
        self.teams = teams
        self.rounds = rounds
        self.client = client or PoliteClient(FSA_BASE, pause_s=0.25, headers={"X-API-Key": key})
        self._by_id = {t.aliases.footballsoccerapi: t.id for t in teams if t.aliases.footballsoccerapi}
        self._by_name: dict[str, str] = {}
        for t in teams:
            for n in {t.name, t.id, *t.aliases.names}:
                self._by_name[norm(n)] = t.id

    @property
    def calls(self) -> int:
        return self.client.calls

    def team(self, fsa_id: str, name: str) -> str:
        if fsa_id in self._by_id:
            return self._by_id[fsa_id]
        key = norm(name)
        if key in self._by_name:
            return self._by_name[key]
        # "Botafogo SP" x "Botafogo-SP", "Operario Ferroviario" x "Operário-PR" etc.
        cands = [tid for n, tid in self._by_name.items() if n and (n in key or key in n)]
        if len(set(cands)) == 1:
            return cands[0]
        raise ProviderError(f"footballsoccerapi: time não reconhecido {name!r} ({fsa_id})")

    def fetch(self, dates: list[str] | None = None) -> SeasonData:
        rows: list[dict] = []
        cursor = None
        for _ in range(5):
            params: dict[str, Any] = {"league_id": FSA_LEAGUE, "season": SEASON, "limit": 1000,
                                      "sort": "kickoff_utc"}
            if cursor:
                params["cursor"] = cursor
            try:
                body = self.client.get_json("/matches", **params)
            except httpx.HTTPError as exc:
                raise ProviderError(f"footballsoccerapi /matches: {exc!r}") from exc
            rows += body.get("data") or []
            cursor = (body.get("meta") or {}).get("next_cursor")
            if not cursor:
                break
        return SeasonData(provider="footballsoccerapi", matches=self.normalize(rows))

    def normalize(self, rows: list[dict]) -> list[Match]:
        out: dict[str, Match] = {}
        for row in rows:
            try:
                r = RawFsaMatch.model_validate(row)
            except ValidationError as exc:
                raise ProviderError(f"footballsoccerapi mudou o formato: {exc}") from exc
            home = self.team(r.home_team_id, r.home_team_name)
            away = self.team(r.away_team_id, r.away_team_name)
            mid = match_id(home, away)
            if mid not in self.rounds:
                continue
            status: MatchStatus = STATUS.get(r.match_status.lower(), "live" if "play" in r.match_status.lower() or "half" in r.match_status.lower() else "scheduled")  # type: ignore[assignment]
            done = status == "finished"
            out[mid] = Match(
                id=mid,
                round=self.rounds[mid],
                kickoff_utc=r.kickoff_utc,
                status=status,
                home_id=home,
                away_id=away,
                home_goals=r.home_goals if done else None,
                away_goals=r.away_goals if done else None,
                ht_home_goals=r.half_time_home_goals if done else None,
                ht_away_goals=r.half_time_away_goals if done else None,
                venue=r.venue_name,
                city=r.city_name,
                source="footballsoccerapi",
            )
        return list(out.values())

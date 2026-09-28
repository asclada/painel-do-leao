"""Gera os arquivos de referência manuais (roda uma vez por temporada).

- data/manual/teams.json  : 20 clubes com slug canônico, sigla, cores e ids em cada provedor
- data/manual/rounds.json : "{mandante}--{visitante}" -> rodada (tabela oficial via ge.globo)

Uso: `uv run python -m pipeline.build_reference` (~39 chamadas, uma única vez).
As cores são curadoria manual (CLUB_COLORS) e devem ser confirmadas pelo Lucas.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata

from pipeline.config import (
    ESPN_BASE,
    ESPN_PAUSE_S,
    GE_BASE,
    GE_EDITION,
    GE_PHASE,
    MANUAL,
    N_TEAMS,
    TOTAL_ROUNDS,
)
from pipeline.http import PoliteClient
from pipeline.models import Team, TeamAliases, match_id


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# Nomes da ESPN que não batem direto com o ge (normalizados).
ESPN_TO_GE = {
    "americamineiro": "americamg",
    "athletic": "athleticclub",
    "atleticogoianiense": "atleticogo",
    "operariopr": "operariopr",
}

# (fundo, texto) — cor principal de cada clube. Curadoria; confirmar com o Lucas.
CLUB_COLORS: dict[str, tuple[str, str]] = {
    "america-mg": ("#00843D", "#FFFFFF"),
    "athletic-club": ("#1A1A1A", "#FFFFFF"),
    "atletico-go": ("#D71920", "#FFFFFF"),
    "avai": ("#0067A5", "#FFFFFF"),
    "botafogo-sp": ("#C8102E", "#FFFFFF"),
    "crb": ("#D0021B", "#FFFFFF"),
    "ceara": ("#1A1A1A", "#FFFFFF"),
    "criciuma": ("#FFD200", "#111111"),
    "cuiaba": ("#00843D", "#FFD200"),
    "fortaleza": ("#E11D2E", "#FFFFFF"),
    "goias": ("#006B3F", "#FFFFFF"),
    "juventude": ("#009845", "#FFFFFF"),
    "londrina": ("#3AA0DC", "#FFFFFF"),
    "novorizontino": ("#FFD200", "#111111"),
    "nautico": ("#D2001F", "#FFFFFF"),
    "operario-pr": ("#1A1A1A", "#FFFFFF"),
    "ponte-preta": ("#1A1A1A", "#FFFFFF"),
    "sport": ("#C8102E", "#FFD200"),
    "sao-bernardo": ("#FFCC00", "#111111"),
    "vila-nova": ("#C8102E", "#FFFFFF"),
}


def main() -> int:
    ge = PoliteClient(f"{GE_BASE}/{GE_EDITION}/fase/{GE_PHASE}", pause_s=1.0)
    espn = PoliteClient(ESPN_BASE, pause_s=ESPN_PAUSE_S)

    ge_teams: dict[int, dict] = {}
    rounds_raw: list[tuple[int, int, int]] = []  # (rodada, ge_mandante, ge_visitante)
    for r in range(1, TOTAL_ROUNDS + 1):
        games = ge.get_json(f"/rodada/{r}/jogos/")
        if len(games) != N_TEAMS // 2:
            print(f"Rodada {r}: {len(games)} jogos (esperado {N_TEAMS // 2})")
            return 1
        for g in games:
            h, a = g["equipes"]["mandante"], g["equipes"]["visitante"]
            ge_teams[h["id"]] = h
            ge_teams[a["id"]] = a
            rounds_raw.append((r, h["id"], a["id"]))
        print(f"  rodada {r}: ok")

    espn_raw = espn.get_json("/teams")["sports"][0]["leagues"][0]["teams"]
    espn_by_norm = {
        ESPN_TO_GE.get(norm(t["team"]["displayName"]), norm(t["team"]["displayName"])): t["team"]
        for t in espn_raw
        if not t["team"]["displayName"].startswith("TBD")
    }

    teams: list[Team] = []
    ge_to_slug: dict[int, str] = {}
    for gid, g in sorted(ge_teams.items(), key=lambda kv: kv[1]["nome_popular"]):
        name = g["nome_popular"]
        slug = slugify(name)
        e = espn_by_norm.get(norm(name))
        if e is None:
            print(f"Sem correspondência na ESPN para {name!r}")
            return 1
        bg, fg = CLUB_COLORS[slug]
        teams.append(
            Team(
                id=slug,
                name=name,
                short_name=g["sigla"],
                color=bg,
                text_color=fg,
                aliases=TeamAliases(
                    espn=e["id"],
                    ge=gid,
                    names=sorted({name, e["displayName"], e.get("shortDisplayName", name)}),
                ),
            )
        )
        ge_to_slug[gid] = slug

    if len(teams) != N_TEAMS:
        print(f"{len(teams)} times encontrados (esperado {N_TEAMS})")
        return 1

    rounds = {match_id(ge_to_slug[h], ge_to_slug[a]): r for r, h, a in rounds_raw}
    if len(rounds) != N_TEAMS * (N_TEAMS - 1):
        print(f"{len(rounds)} confrontos únicos (esperado {N_TEAMS * (N_TEAMS - 1)})")
        return 1

    MANUAL.mkdir(parents=True, exist_ok=True)
    (MANUAL / "teams.json").write_text(
        json.dumps([t.dump() for t in teams], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    (MANUAL / "rounds.json").write_text(
        json.dumps(dict(sorted(rounds.items())), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"OK: {len(teams)} times, {len(rounds)} jogos mapeados. Chamadas: ge={ge.calls}, espn={espn.calls}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

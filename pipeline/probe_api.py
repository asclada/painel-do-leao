"""Sondagem inicial da API de futebol.

Roda com `uv run python -m pipeline.probe_api` (ou `pnpm probe`).
Descobre o que o provedor entrega para a Série B 2026 e gera `docs/api-report.md`,
salvando amostras cruas em `docs/api-samples/`. Usa poucas requisições (~6).
"""

from __future__ import annotations

import json
import os
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SAMPLES = DOCS / "api-samples"
SEASON = 2026

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")


def norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return s.lower().strip()


def save_sample(name: str, payload: Any) -> None:
    SAMPLES.mkdir(parents=True, exist_ok=True)
    (SAMPLES / f"{name}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def find_keys(obj: Any, needles: tuple[str, ...], prefix: str = "") -> list[str]:
    """Lista caminhos de chaves (recursivo) cujo nome contém algum dos termos."""
    found: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            if any(n in k.lower() for n in needles):
                found.append(path)
            found += find_keys(v, needles, path)
    elif isinstance(obj, list) and obj:
        found += find_keys(obj[0], needles, prefix + "[]")
    return found


class Probe:
    def __init__(self, base_url: str, headers: dict[str, str]):
        self.client = httpx.Client(base_url=base_url, headers=headers, timeout=30)
        self.calls = 0

    def get(self, path: str, **params: Any) -> tuple[int, Any]:
        self.calls += 1
        r = self.client.get(path, params=params or None)
        try:
            body = r.json()
        except ValueError:
            body = {"raw": r.text[:2000]}
        print(f"  GET {path} {params or ''} -> {r.status_code}")
        return r.status_code, body


# --------------------------------------------------------------------------- #
# Provedor 1: footballsoccerapi.com
# --------------------------------------------------------------------------- #

FSA_LEAGUE = "lg_1VQKEDM"


def probe_footballsoccerapi(key: str) -> list[str]:
    p = Probe("https://api.footballsoccerapi.com/v1", {"X-API-Key": key})
    lines: list[str] = []

    _, usage_before = p.get("/usage")
    save_sample("usage_before", usage_before)

    _, league = p.get(f"/leagues/{FSA_LEAGUE}")
    save_sample("league", league)

    matches: list[dict] = []
    cursor = None
    first_page = None
    while True:
        params: dict[str, Any] = {
            "league_id": FSA_LEAGUE,
            "season": SEASON,
            "limit": 1000,
            "sort": "kickoff_utc",
        }
        if cursor:
            params["cursor"] = cursor
        status, body = p.get("/matches", **params)
        if status != 200:
            save_sample("matches_error", body)
            lines.append(f"**Erro na listagem ({status}):** `{json.dumps(body)[:400]}`")
            return lines + usage_lines(p, usage_before)
        first_page = first_page or body
        matches += body.get("data", [])
        cursor = (body.get("meta") or {}).get("next_cursor")
        if not cursor or p.calls > 8:
            break
    save_sample("matches_page1", {**first_page, "data": first_page.get("data", [])[:5]})
    save_sample("matches_all", matches)

    statuses = Counter(m.get("match_status") or m.get("status") for m in matches)
    teams: dict[str, str] = {}
    for m in matches:
        teams[m.get("home_team_id")] = m.get("home_team_name")
        teams[m.get("away_team_id")] = m.get("away_team_name")
    fortaleza = [tid for tid, name in teams.items() if "fortaleza" in norm(name)]
    fid = fortaleza[0] if fortaleza else None

    sample_row = matches[0] if matches else {}
    round_keys = find_keys(sample_row, ("round", "week", "matchday", "stage"))
    ht_keys = find_keys(sample_row, ("half_time", "halftime", "ht_"))

    lines += [
        "## footballsoccerapi.com",
        "",
        f"- Liga `{FSA_LEAGUE}`: {json.dumps((league or {}).get('data', league), ensure_ascii=False)[:300]}",
        f"- **Jogos retornados:** {len(matches)} (esperado: 380)",
        f"- **Status:** {dict(statuses)}",
        f"- **Times distintos:** {len(teams)} (esperado: 20)",
        f"- **ID do Fortaleza:** `{fid}`",
        f"- **Campos de rodada na listagem:** {round_keys or 'nenhum'}",
        f"- **Campos de intervalo na listagem:** {ht_keys or 'nenhum'}",
        f"- **Chaves de um jogo da listagem:** `{', '.join(sample_row.keys())}`",
        "",
        "### Times",
        "",
        "| ID | Nome |",
        "|---|---|",
        *[f"| `{tid}` | {name} |" for tid, name in sorted(teams.items(), key=lambda t: t[1] or "")],
        "",
    ]

    finished_for = [
        m
        for m in matches
        if fid in (m.get("home_team_id"), m.get("away_team_id"))
        and (m.get("match_status") or m.get("status")) == "finished"
    ]
    if finished_for:
        mid = finished_for[-1]["match_id"] if "match_id" in finished_for[-1] else finished_for[-1].get("id")
        status, detail = p.get(f"/matches/{mid}")
        save_sample("match_detail", detail)
        data = (detail or {}).get("data", detail) or {}
        stats = data.get("statistics") or []
        stat_keys = sorted({k for s in stats for k in (s.get("statistics") or {}).keys()})
        lines += [
            "### Detalhe de um jogo do Fortaleza",
            "",
            f"- Jogo `{mid}` -> HTTP {status}",
            f"- **Chaves do detalhe:** `{', '.join(data.keys()) if isinstance(data, dict) else '?'}`",
            f"- **Campos de rodada no detalhe:** {find_keys(data, ('round', 'week', 'matchday')) or 'nenhum'}",
            f"- **Estatísticas por time:** {'sim' if stats else 'não'} -> `{', '.join(stat_keys)}`",
            f"- **Cartões:** {[k for k in stat_keys if 'card' in k] or 'não encontrados'}",
            f"- **Gols com minuto no detalhe:** {find_keys(data, ('goal_minute', 'minute', 'events', 'scorer')) or 'nenhum'}",
            "",
        ]
        status, events = p.get(f"/matches/{mid}/events")
        save_sample("match_events", events)
        lines += [f"- `/matches/{{id}}/events` (gols com minuto) -> HTTP {status}", ""]
    else:
        lines += ["- Nenhum jogo encerrado do Fortaleza encontrado para detalhar.", ""]

    return lines + usage_lines(p, usage_before)


def usage_lines(p: Probe, usage_before: Any) -> list[str]:
    _, usage_after = p.get("/usage")
    save_sample("usage_after", usage_after)
    return [
        "### Uso do plano",
        "",
        f"- Requisições feitas nesta sondagem: **{p.calls}**",
        f"- Uso depois da sondagem: `{json.dumps((usage_after or {}).get('data', usage_after), ensure_ascii=False)[:600]}`",
        "",
    ]


# --------------------------------------------------------------------------- #
# Provedor 2: API-Football (api-sports.io)
# --------------------------------------------------------------------------- #


def probe_apifootball(key: str) -> list[str]:
    p = Probe("https://v3.football.api-sports.io", {"x-apisports-key": key})
    _, status = p.get("/status")
    save_sample("af_status", status)
    _, leagues = p.get("/leagues", country="Brazil", season=SEASON)
    save_sample("af_leagues", leagues)
    serie_b = next(
        (
            lg for lg in (leagues or {}).get("response", [])
            if "serie b" in norm(lg["league"]["name"])
        ),
        None,
    )
    lid = serie_b["league"]["id"] if serie_b else 72
    _, fixtures = p.get("/fixtures", league=lid, season=SEASON)
    save_sample("af_fixtures", fixtures)
    rows = (fixtures or {}).get("response", [])
    teams = {}
    for f in rows:
        for side in ("home", "away"):
            teams[f["teams"][side]["id"]] = f["teams"][side]["name"]
    fid = next((t for t, n in teams.items() if "fortaleza" in norm(n)), None)
    statuses = Counter(f["fixture"]["status"]["short"] for f in rows)
    lines = [
        "## API-Football",
        "",
        f"- Erros: `{(fixtures or {}).get('errors')}`",
        f"- Liga Série B: `{lid}`",
        f"- **Jogos retornados:** {len(rows)}; status: {dict(statuses)}",
        f"- **Times distintos:** {len(teams)}; **ID do Fortaleza:** `{fid}`",
        f"- Rodada: `league.round` (ex.: {rows[0]['league']['round'] if rows else '?'})",
        "",
    ]
    done = [
        f for f in rows
        if fid in (f["teams"]["home"]["id"], f["teams"]["away"]["id"])
        and f["fixture"]["status"]["short"] == "FT"
    ]
    if done:
        _, ev = p.get("/fixtures/events", fixture=done[-1]["fixture"]["id"])
        save_sample("af_events", ev)
        lines.append(f"- Eventos (gols com minuto): {len((ev or {}).get('response', []))} eventos")
    lines.append(f"- Requisições feitas: **{p.calls}**; status da conta: `{json.dumps((status or {}).get('response'))[:400]}`")
    return lines


def main() -> int:
    key = os.environ.get("FOOTBALL_API_KEY", "").strip()
    provider = os.environ.get("FOOTBALL_API_PROVIDER", "footballsoccerapi").strip()
    if not key:
        print("FOOTBALL_API_KEY não definida. Preencha o .env.local (veja .env.example).")
        return 1
    print(f"Sondando provedor: {provider}")
    lines = [
        "# Relatório da API",
        "",
        f"Gerado por `pipeline/probe_api.py` em {datetime.now(timezone.utc).isoformat(timespec='seconds')}.",
        "",
    ]
    if provider == "apifootball":
        lines += probe_apifootball(key)
    else:
        lines += probe_footballsoccerapi(key)
    DOCS.mkdir(exist_ok=True)
    (DOCS / "api-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())

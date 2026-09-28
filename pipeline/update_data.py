"""Pipeline completo (roda no GitHub Actions a cada 2h).

Uso: `uv run python -m pipeline.update_data [--force]`

Etapas já implementadas: busca (com fallback), tabela e meta.
Próximas (Dia 1): linha do tempo, corrida, raio-x, simulação, model.json.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from pipeline.calc.standings import compute_standings
from pipeline.config import DATA, FORTALEZA_ID, ROOT, SEASON
from pipeline.fetch import (
    DETAILS_FILE,
    MATCHES_FILE,
    iso,
    run_fetch,
    save_state,
)
from pipeline.providers.base import ProviderError, load_rounds, load_teams
from pipeline.providers.espn import EspnProvider, LocalCacheClient


def write_json(path: Path, data: Any) -> bool:
    """Grava com formatação estável. Devolve True se o conteúdo mudou."""
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="consulta mesmo sem jogo novo")
    ap.add_argument("--offline", action="store_true",
                    help="reprocessa tudo a partir de .cache/ (sem chamadas; só dev)")
    args = ap.parse_args(argv)

    load_dotenv(ROOT / ".env.local")
    now = datetime.now(timezone.utc)
    teams = load_teams()
    rounds = load_rounds()

    espn = None
    if args.offline:
        MATCHES_FILE.unlink(missing_ok=True)
        espn = EspnProvider(teams, rounds, client=LocalCacheClient())
    try:
        res = run_fetch(teams, rounds, now=now, force=args.force, espn=espn)
    except ProviderError as exc:
        print(f"ERRO: {exc}")
        return 1

    if res.season is None:
        print("Nenhum jogo terminou desde a última atualização. Nada a consultar (0 chamadas).")
        return 0

    season = res.season
    fort_done = [
        m for m in season.matches
        if m.status == "finished" and FORTALEZA_ID in (m.home_id, m.away_id)
    ]
    has_goal_minutes = bool(fort_done) and all(
        (d := season.details.get(m.id)) is not None and d.goals_complete for m in fort_done
    )
    has_half_time = bool(fort_done) and all(m.ht_home_goals is not None for m in fort_done)
    standings = compute_standings(teams, season.matches, season.details)
    finished_rounds = [
        r for r in range(1, 39)
        if all(m.status == "finished" for m in season.matches if m.round == r)
    ]
    last_round = max((r for r in finished_rounds if all(x in finished_rounds for x in range(1, r + 1))), default=0)

    changed = False
    public_teams = [t.model_dump(by_alias=True, exclude={"aliases"}) for t in teams]
    changed |= write_json(DATA / "teams.json", public_teams)
    changed |= write_json(MATCHES_FILE, [m.dump() for m in season.matches])
    changed |= write_json(DETAILS_FILE, {k: v.dump() for k, v in sorted(season.details.items())})
    changed |= write_json(DATA / "standings.json", [r.dump() for r in standings])

    meta_path = DATA / "meta.json"
    old_meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    meta = {
        "season": SEASON,
        "fortalezaId": FORTALEZA_ID,
        "lastCompletedRound": last_round,
        "provider": res.provider_used,
        "hasGoalMinutes": has_goal_minutes,
        "hasHalfTime": has_half_time,
        "seasonState": "regular" if any(m.status != "finished" for m in season.matches) else "playoffs",
        "updatedAt": old_meta.get("updatedAt"),
    }
    if changed or {k: v for k, v in meta.items() if k != "updatedAt"} != {
        k: v for k, v in old_meta.items() if k != "updatedAt"
    }:
        meta["updatedAt"] = iso(now)
        changed = True
    write_json(meta_path, meta)
    save_state(res.state)

    fort = next(r for r in standings if r.team_id == FORTALEZA_ID)
    print(
        f"Provedor: {res.provider_used} | chamadas: {res.calls} | jogos pendentes: {res.due} | "
        f"rodada concluída: {last_round} | Fortaleza: {fort.position}º, {fort.points} pts "
        f"({fort.played} J) | dados mudaram: {changed}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

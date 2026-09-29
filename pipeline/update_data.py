"""Pipeline completo (roda no GitHub Actions a cada 2h).

Uso: `uv run python -m pipeline.update_data [--force] [--recompute] [--offline]`

1. Busca (ESPN; reserva footballsoccerapi) só se algum jogo terminou.
2. Calcula tabela, linha do tempo, marcos, sequências, raio-x, corrida, próximo jogo.
3. Roda 20.000 simulações do campeonato (semente fixa por rodada) + checagens de sanidade.
4. Grava os JSON em /data (formatação estável; updatedAt só muda se algo mudou).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from pipeline.calc.insights import (
    bins_insight,
    halves_insight,
    streak_insight,
    turn_insight,
    venue_insight,
)
from pipeline.calc.milestones import auto_milestones, headline, load_manual, select_milestones
from pipeline.calc.model_input import build_model_input
from pipeline.calc.next_match import compute_next_match
from pipeline.crests import ensure_crests
from pipeline.calc.race import compute_race
from pipeline.calc.standings import compute_standings
from pipeline.calc.streaks import compute_streaks
from pipeline.calc.timeline import positions_by_round, team_timeline
from pipeline.calc.xray import compute_xray_parts
from pipeline.config import DATA, FORTALEZA_ID, N_SIMS_PIPELINE, ROOT, SEASON, TOTAL_ROUNDS
from pipeline.fetch import DETAILS_FILE, MATCHES_FILE, iso, load_cached, run_fetch, save_state
from pipeline.model.simulate import simulate_season
from pipeline.model.summarize import magic_numbers, points_dist, sanity_check, team_odds
from pipeline.models import SeasonData, Team
from pipeline.outputs import HistoryEntry, Meta, Simulation, Timeline, XRay
from pipeline.providers.base import ProviderError, load_rounds, load_teams
from pipeline.providers.espn import EspnProvider, LocalCacheClient

OUTPUT_FILES = ["meta", "teams", "standings", "timeline", "xray", "race", "next-match",
                "simulation", "model", "history"]


def write_json(path: Path, data: Any) -> bool:
    """Grava com formatação estável. Devolve True se o conteúdo mudou."""
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def last_completed_round(season: SeasonData) -> int:
    last = 0
    for r in range(1, TOTAL_ROUNDS + 1):
        if all(m.status == "finished" for m in season.matches if m.round == r):
            last = r
        else:
            break
    return last


def compute_outputs(season: SeasonData, teams: list[Team]) -> dict[str, Any]:
    """Calcula todos os arquivos de saída (sem gravar). Levanta ValueError se a sanidade falhar."""
    names = {t.id: t.name for t in teams}
    articles = {t.id: t.article for t in teams}
    matches, details = season.matches, season.details
    last_round = last_completed_round(season)
    standings = compute_standings(teams, matches, details)

    fort_done = [m for m in matches if m.status == "finished" and FORTALEZA_ID in (m.home_id, m.away_id)]
    has_goal_minutes = bool(fort_done) and all(
        (d := details.get(m.id)) is not None and d.goals_complete for m in fort_done
    )
    has_half_time = bool(fort_done) and all(m.ht_home_goals is not None for m in fort_done)

    # linha do tempo: até a última rodada com algum jogo encerrado (inclui a rodada em andamento)
    played_rounds = {m.round for m in matches if m.status == "finished"}
    tl_round = max(played_rounds, default=0)
    by_round = positions_by_round(teams, matches, tl_round)
    points = team_timeline(FORTALEZA_ID, matches, by_round)
    milestones = select_milestones(auto_milestones(points, names), load_manual(), tl_round)
    timeline = Timeline(
        team_id=FORTALEZA_ID,
        points=points,
        rivals={t.id: [by_round[r][t.id][0] for r in sorted(by_round)] for t in teams if t.id != FORTALEZA_ID},
        milestones=milestones,
        headline=headline(points),
    )

    # simulação
    team_ids = sorted(t.id for t in teams)
    model = build_model_input(team_ids, matches, standings, last_round)
    seed = (last_round + 1) * 1000 + len([m for m in matches if m.status == "finished"])
    sim = simulate_season(model, N_SIMS_PIPELINE, seed)
    odds = team_odds(sim, team_ids)
    problems = sanity_check(odds)
    if problems:
        raise ValueError("Checagem de sanidade falhou: " + "; ".join(problems))
    fort_row = next(r for r in standings if r.team_id == FORTALEZA_ID)
    magic = magic_numbers(sim, model.focus_team, fort_row.points, len(model.focus_remaining))
    simulation = Simulation(
        n_sims=N_SIMS_PIPELINE, seed=seed, teams=odds, magic=magic,
        focus_points=points_dist(sim, model.focus_team),
    )

    # raio-x
    parts = compute_xray_parts(matches, details, FORTALEZA_ID)
    streaks = compute_streaks(matches, FORTALEZA_ID)
    insights = {
        "venue": venue_insight(parts["home"], parts["away"]),
        "turns": turn_insight(parts["first_turn"], parts["second_turn"]),
        "streaks": streak_insight(streaks, names),
    }
    if parts["halves"]:
        insights["halves"] = halves_insight(parts["halves"])
    if parts["goal_bins"]:
        insights["goalBins"] = bins_insight(parts["goal_bins"])
    xray = XRay(**parts, streaks=streaks, insights=insights)

    strength = dict(zip(team_ids, model.ratings.strength))
    race = compute_race(standings, matches, odds, strength, names, FORTALEZA_ID, articles)
    nxt = compute_next_match(matches, FORTALEZA_ID, names)

    fort_odds = next(o for o in odds if o.team_id == FORTALEZA_ID)
    return {
        "meta_fields": dict(
            season=SEASON, fortaleza_id=FORTALEZA_ID, last_completed_round=last_round,
            has_goal_minutes=has_goal_minutes, has_half_time=has_half_time,
            season_state="regular" if any(m.status != "finished" for m in matches) else "playoffs",
        ),
        "teams": [t.model_dump(by_alias=True, exclude={"aliases"}) for t in teams],
        "standings": [r.dump() for r in standings],
        "timeline": timeline.dump(),
        "xray": xray.dump(),
        "race": race.dump(),
        "next-match": nxt.dump() if nxt else None,
        "simulation": simulation.dump(),
        "model": model.dump(),
        "history_entry": HistoryEntry(round=last_round, p_promotion=fort_odds.p_promotion,
                                      p_direct=fort_odds.p_direct, p_top6=fort_odds.p_top6),
    }


def write_outputs(out: dict[str, Any], provider: str | None, now: datetime) -> bool:
    changed = False
    for name in ["teams", "standings", "timeline", "xray", "race", "next-match", "simulation", "model"]:
        changed |= write_json(DATA / f"{name}.json", out[name])

    hist_path = DATA / "history.json"
    history = json.loads(hist_path.read_text(encoding="utf-8")) if hist_path.exists() else []
    entry = out["history_entry"].dump()
    if entry["round"] > 0:
        history = [h for h in history if h["round"] != entry["round"]] + [entry]
        history.sort(key=lambda h: h["round"])
    changed |= write_json(hist_path, history)

    meta_path = DATA / "meta.json"
    old = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    meta = Meta(provider=provider or old.get("provider"), updated_at=old.get("updatedAt"),
                **out["meta_fields"]).dump()
    if changed or any(meta[k] != old.get(k) for k in meta if k != "updatedAt"):
        meta["updatedAt"] = iso(now)
        changed = True
    write_json(meta_path, meta)
    return changed


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="consulta a fonte mesmo sem jogo novo")
    ap.add_argument("--recompute", action="store_true", help="recalcula as saídas a partir do cache, sem consultar")
    ap.add_argument("--offline", action="store_true", help="reprocessa tudo a partir de .cache/ (dev)")
    args = ap.parse_args(argv)

    load_dotenv(ROOT / ".env.local")
    now = datetime.now(timezone.utc)
    teams = load_teams()
    rounds = load_rounds()
    if not args.offline:
        new_crests = ensure_crests(teams)  # só baixa o que falta (0 chamadas no dia a dia)
        if new_crests:
            print(f"Escudos novos: {', '.join(new_crests)}")

    provider = None
    if args.recompute:
        season = load_cached()
        res = None
    else:
        espn = None
        if args.offline:
            MATCHES_FILE.unlink(missing_ok=True)
            espn = EspnProvider(teams, rounds, client=LocalCacheClient())
        try:
            res = run_fetch(teams, rounds, now=now, force=args.force, espn=espn)
        except ProviderError as exc:
            print(f"ERRO: {exc}")
            return 1
        season = res.season
        provider = res.provider_used
        if season is None:
            missing = [f for f in OUTPUT_FILES if not (DATA / f"{f}.json").exists()]
            if not missing:
                print("Nenhum jogo terminou desde a última atualização. Nada a consultar (0 chamadas).")
                return 0
            print(f"Sem jogo novo, mas faltam saídas ({', '.join(missing)}): recalculando do cache.")
            season = load_cached()

    if season is None:
        print("ERRO: sem dados em cache. Rode sem --recompute primeiro.")
        return 1

    try:
        out = compute_outputs(season, teams)
    except ValueError as exc:
        print(f"ERRO: {exc}")
        return 1

    changed = write_json(MATCHES_FILE, [m.dump() for m in season.matches])
    changed |= write_json(DETAILS_FILE, {k: v.dump() for k, v in sorted(season.details.items())})
    changed |= write_outputs(out, provider, now)
    if res is not None:
        save_state(res.state)

    sim = out["simulation"]
    fort = next(o for o in sim["teams"] if o["teamId"] == FORTALEZA_ID)
    row = next(r for r in out["standings"] if r["teamId"] == FORTALEZA_ID)
    calls = res.calls if res else {}
    print(
        f"Provedor: {provider or 'cache'} | chamadas: {calls} | rodada concluída: "
        f"{out['meta_fields']['last_completed_round']} | Fortaleza: {row['position']}º, {row['points']} pts | "
        f"acesso {fort['pPromotion']:.1%} (direto {fort['pDirect']:.1%}) | dados mudaram: {changed}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

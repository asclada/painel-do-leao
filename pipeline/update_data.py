"""Pipeline completo (roda no GitHub Actions a cada 2h).

Uso: `uv run python -m pipeline.update_data [--force] [--recompute] [--offline]`

1. Busca (ESPN; reserva footballsoccerapi) só se algum jogo terminou.
2. Calcula tabela, linha do tempo, marcos, sequências, raio-x, corrida, próximo jogo.
3. Roda 20.000 simulações do campeonato (semente fixa por rodada) + checagens de sanidade e, com a mesma
   semente, o "Pra secar" (jogos dos rivais que mais mexem na chance).
4. Backtest rodada a rodada (só as rodadas novas ou que mudaram) e calibração.
5. Grava os JSON em /data (formatação estável; updatedAt só muda se algo mudou) e docs/CALIBRACAO.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from dotenv import load_dotenv

from pipeline.calc.backtest import Backtest, run_backtest
from pipeline.calc.calibration import calibration_markdown, compute_calibration
from pipeline.calc.clinch import compute_clinch
from pipeline.calc.insights import (
    bins_insight,
    halves_insight,
    streak_insight,
    turn_insight,
    venue_insight,
)
from pipeline.calc.key_games import compute_key_games
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
from pipeline.fetch import (
    DETAILS_FILE,
    MATCHES_FILE,
    data_status,
    iso,
    load_cached,
    load_state,
    run_fetch,
    save_state,
)
from pipeline.model.match_probs import outcome_probs
from pipeline.model.simulate import simulate_season
from pipeline.model.types import ModelInput
from pipeline.model.summarize import TeamOdds, magic_numbers, points_dist, sanity_check, team_odds
from pipeline.models import SeasonData, StandingRow, Team
from pipeline.outputs import HistoryEntry, MatchChances, Meta, Simulation, Timeline, XRay
from pipeline.providers.base import ProviderError, load_rounds, load_teams
from pipeline.providers.espn import EspnProvider, LocalCacheClient

OUTPUT_FILES = ["meta", "teams", "standings", "timeline", "xray", "race", "next-match",
                "simulation", "model", "history", "backtest", "key-games", "calibration"]
BACKTEST_FILE = DATA / "backtest.json"
CALIBRATION_DOC = ROOT / "docs" / "CALIBRACAO.md"


def write_json(path: Path, data: Any) -> bool:
    """Grava com formatação estável. Devolve True se o conteúdo mudou."""
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    return write_text(path, text)


def write_text(path: Path, text: str) -> bool:
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def load_backtest() -> Backtest | None:
    if not BACKTEST_FILE.exists():
        return None
    try:
        return Backtest.model_validate_json(BACKTEST_FILE.read_text(encoding="utf-8"))
    except ValueError:
        return None  # formato antigo: recalcula tudo


def last_completed_round(season: SeasonData) -> int:
    last = 0
    for r in range(1, TOTAL_ROUNDS + 1):
        if all(m.status == "finished" for m in season.matches if m.round == r):
            last = r
        else:
            break
    return last


def chance_history(
    backtest: Backtest, fort_odds: TeamOdds, fort_row: StandingRow, last_round: int, partial: bool
) -> list[HistoryEntry]:
    """Chance do Fortaleza rodada a rodada. O último ponto é sempre a chance de agora (20 mil simulações, a mesma
    do topo): substitui o retrato da última rodada completa ou, com rodada em andamento, entra depois dele."""
    out = [
        HistoryEntry(round=b.round, p_promotion=t.p_promotion, p_direct=t.p_direct, p_top6=t.p_top6,
                     position=t.position, points=t.points)
        for b in backtest.rounds
        if (t := b.teams[FORTALEZA_ID])
    ]
    now = HistoryEntry(round=last_round + 1 if partial else last_round, p_promotion=fort_odds.p_promotion,
                       p_direct=fort_odds.p_direct, p_top6=fort_odds.p_top6, position=fort_row.position,
                       points=fort_row.points, partial=partial)
    if now.round < 1:
        return out
    return [h for h in out if h.round != now.round] + [now]


def next_match_chances(model: ModelInput, match_id: str, seed: int) -> MatchChances | None:
    """Vitória/empate/derrota do Fortaleza no próximo jogo, direto da distribuição de gols (sem sorteio de placar)."""
    m = next((r for r in model.remaining if r.id == match_id), None)
    if m is None:
        return None
    p_home, p_draw, p_away = outcome_probs(
        model.ratings, np.array([m.home]), np.array([m.away]), np.random.default_rng([seed, 2]), n_draws=20_000
    )[0]
    home = m.home == model.focus_team
    return MatchChances(win=round(float(p_home if home else p_away), 4), draw=round(float(p_draw), 4),
                        loss=round(float(p_away if home else p_home), 4))


def compute_outputs(
    season: SeasonData, teams: list[Team], previous_backtest: Backtest | None = None, log=print
) -> dict[str, Any]:
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
        focus_points=points_dist(sim, model.focus_team), clinch=compute_clinch(standings),
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

    race = compute_race(standings, matches, odds, model.ratings, team_ids, names, FORTALEZA_ID, articles)
    nxt = compute_next_match(matches, FORTALEZA_ID, names)
    if nxt is not None:
        nxt.chances = next_match_chances(model, nxt.match_id, seed)
    key_games = compute_key_games(model, sim, N_SIMS_PIPELINE, seed)

    # backtest e calibração (só as rodadas novas são simuladas)
    backtest = run_backtest(teams, matches, details, last_round, previous_backtest, log=log)
    calibration = compute_calibration(backtest, teams, matches)
    fort_odds = next(o for o in odds if o.team_id == FORTALEZA_ID)
    partial = any(m.status == "finished" and m.round > last_round for m in matches)
    history = chance_history(backtest, fort_odds, fort_row, last_round, partial)

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
        "history": [h.dump() for h in history],
        "key-games": key_games.dump(),
        "backtest": backtest.dump(),
        "calibration": calibration.dump(),
        "calibration_doc": calibration_markdown(calibration, last_round),
    }


def write_outputs(out: dict[str, Any], provider: str | None, now: datetime, status: dict | None = None) -> bool:
    changed = False
    for name in ["teams", "standings", "timeline", "xray", "race", "next-match", "simulation", "model",
                 "history", "key-games", "backtest", "calibration"]:
        changed |= write_json(DATA / f"{name}.json", out[name])
    write_text(CALIBRATION_DOC, out["calibration_doc"])

    meta_path = DATA / "meta.json"
    old = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    meta = Meta(provider=provider or old.get("provider"), updated_at=old.get("updatedAt"),
                data_status=status or old.get("dataStatus") or {}, **out["meta_fields"]).dump()
    # o status da fonte não conta como dado novo: o "Atualizado há..." continua honesto quando a fonte falha
    if changed or any(meta[k] != old.get(k) for k in meta if k not in ("updatedAt", "dataStatus")):
        meta["updatedAt"] = iso(now)
        changed = True
    write_json(meta_path, meta)
    return changed


def write_data_status(status: dict) -> None:
    """Só atualiza o status da fonte no meta.json (quando nenhum provedor respondeu)."""
    meta_path = DATA / "meta.json"
    if not meta_path.exists():
        return
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["dataStatus"] = status
    write_json(meta_path, meta)


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
            # nenhum provedor respondeu: o site passa a avisar que os dados podem estar atrasados
            cached = load_cached()
            if cached is not None:
                write_data_status(data_status(cached.matches, load_state(), now))
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
        out = compute_outputs(season, teams, load_backtest())
    except ValueError as exc:
        print(f"ERRO: {exc}")
        return 1

    changed = write_json(MATCHES_FILE, [m.dump() for m in season.matches])
    changed |= write_json(DETAILS_FILE, {k: v.dump() for k, v in sorted(season.details.items())})
    status = data_status(season.matches, res.state if res is not None else load_state(), now)
    changed |= write_outputs(out, provider, now, status)
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

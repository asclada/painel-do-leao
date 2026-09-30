"""Monta o data/model.json (entrada da simulação) a partir dos jogos normalizados."""

from __future__ import annotations

import numpy as np

from pipeline.config import FORTALEZA_ID, SEASON
from pipeline.model.ratings import fit_ratings
from pipeline.model.types import ModelInput, RemainingMatch, TableState
from pipeline.models import Match, StandingRow


def build_model_input(
    team_ids: list[str],
    matches: list[Match],
    standings: list[StandingRow],
    last_completed_round: int,
) -> ModelInput:
    idx = {t: i for i, t in enumerate(team_ids)}
    done = [m for m in matches if m.status == "finished"]
    ratings = fit_ratings(
        len(team_ids),
        home=np.array([idx[m.home_id] for m in done]),
        away=np.array([idx[m.away_id] for m in done]),
        home_goals=np.array([m.home_goals for m in done]),
        away_goals=np.array([m.away_goals for m in done]),
        rounds=np.array([m.round for m in done]),
    )
    row = {r.team_id: r for r in standings}
    n_teams = len(team_ids)
    h2h_points = np.zeros((n_teams, n_teams), dtype=int)
    h2h_gd = np.zeros((n_teams, n_teams), dtype=int)
    for m in done:
        h, a, hg, ag = idx[m.home_id], idx[m.away_id], m.home_goals, m.away_goals
        h2h_points[h, a] += 3 * (hg > ag) + (hg == ag)
        h2h_points[a, h] += 3 * (ag > hg) + (hg == ag)
        h2h_gd[h, a] += hg - ag
        h2h_gd[a, h] += ag - hg
    has_cards = all(row[t].red is not None and row[t].yellow is not None for t in team_ids)
    table = TableState(
        points=[row[t].points for t in team_ids],
        wins=[row[t].wins for t in team_ids],
        goal_diff=[row[t].goal_diff for t in team_ids],
        goals_for=[row[t].goals_for for t in team_ids],
        h2h_points=h2h_points.tolist(),
        h2h_goal_diff=h2h_gd.tolist(),
        red=[row[t].red for t in team_ids] if has_cards else None,
        yellow=[row[t].yellow for t in team_ids] if has_cards else None,
    )
    left = sorted(
        (m for m in matches if m.status not in ("finished", "cancelled")),
        key=lambda m: (m.kickoff_utc, m.id),
    )
    remaining = [
        RemainingMatch(id=m.id, round=m.round, kickoff_utc=m.kickoff_utc, home=idx[m.home_id], away=idx[m.away_id])
        for m in left
    ]
    focus = idx[FORTALEZA_ID]
    return ModelInput(
        season=SEASON,
        last_completed_round=last_completed_round,
        teams=team_ids,
        focus_team=focus,
        table=table,
        ratings=ratings,
        remaining=remaining,
        focus_remaining=[i for i, r in enumerate(remaining) if focus in (r.home, r.away)],
    )

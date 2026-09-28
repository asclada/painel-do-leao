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
    table = TableState(
        points=[row[t].points for t in team_ids],
        wins=[row[t].wins for t in team_ids],
        goal_diff=[row[t].goal_diff for t in team_ids],
        goals_for=[row[t].goals_for for t in team_ids],
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

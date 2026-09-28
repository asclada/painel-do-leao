"""Raio-X do time (F5): casa x fora, 1º x 2º tempo, gols por faixa, turno x returno."""

from __future__ import annotations

from pipeline.calc.common import finished, goals, result, team_matches
from pipeline.models import Match, MatchDetails
from pipeline.outputs import GoalBin, HalfSplit, TurnSplit, VenueSplit

BINS = [("1–15", 1, 15, 1), ("16–30", 16, 30, 1), ("31–45+", 31, 45, 1),
        ("46–60", 46, 60, 2), ("61–75", 61, 75, 2), ("76–90+", 76, 90, 2)]


def venue_split(ms: list[Match], team: str) -> VenueSplit:
    res = [result(m, team) for m in ms]
    gf = sum(goals(m, team)[0] for m in ms)
    ga = sum(goals(m, team)[1] for m in ms)
    w, d, l_ = res.count("V"), res.count("E"), res.count("D")
    pts = 3 * w + d
    return VenueSplit(played=len(ms), wins=w, draws=d, losses=l_, points=pts,
                      pct=round(100 * pts / (3 * len(ms))) if ms else 0, goals_for=gf, goals_against=ga)


def half_split(ms: list[Match], team: str) -> HalfSplit | None:
    if any(m.ht_home_goals is None for m in ms):
        return None
    f1 = a1 = f2 = a2 = 0
    for m in ms:
        home = m.home_id == team
        ht_for = m.ht_home_goals if home else m.ht_away_goals
        ht_ag = m.ht_away_goals if home else m.ht_home_goals
        gf, ga = goals(m, team)
        f1, a1 = f1 + ht_for, a1 + ht_ag
        f2, a2 = f2 + gf - ht_for, a2 + ga - ht_ag
    total = f1 + f2
    return HalfSplit(first_for=f1, first_against=a1, second_for=f2, second_against=a2,
                     pct_second_half_for=round(100 * f2 / total) if total else 0)


def goal_bins(ms: list[Match], team: str, details: dict[str, MatchDetails]) -> list[GoalBin] | None:
    if any(not (details.get(m.id) and details[m.id].goals_complete) for m in ms):
        return None
    out = []
    for label, lo, hi, period in BINS:
        gf = ga = 0
        for m in ms:
            for g in details[m.id].goals:
                if g.period == period and lo <= g.minute <= hi:
                    if g.team_id == team:
                        gf += 1
                    else:
                        ga += 1
        out.append(GoalBin(label=label, goals_for=gf, goals_against=ga))
    return out


def turn_split(ms: list[Match], team: str) -> TurnSplit:
    pts = sum({"V": 3, "E": 1, "D": 0}[result(m, team)] for m in ms)
    n = len(ms)
    return TurnSplit(played=n, points=pts, ppg=round(pts / n, 2) if n else 0.0,
                     pct=round(100 * pts / (3 * n)) if n else 0)


def compute_xray_parts(matches: list[Match], details: dict[str, MatchDetails], team: str) -> dict:
    ms = team_matches(finished(matches), team)
    return {
        "home": venue_split([m for m in ms if m.home_id == team], team),
        "away": venue_split([m for m in ms if m.away_id == team], team),
        "halves": half_split(ms, team),
        "goal_bins": goal_bins(ms, team, details),
        "first_turn": turn_split([m for m in ms if m.round <= 19], team),
        "second_turn": turn_split([m for m in ms if m.round >= 20], team),
    }

import pytest

from pipeline.models import GoalEvent
from pipeline.providers.base import ProviderError
from pipeline.providers.espn import (
    EspnProvider,
    RawScoreboard,
    RawStatusType,
    dedupe_goals,
    espn_date_key,
    fix_own_goals,
    map_status,
    parse_clock,
)
from pipeline.providers.footballsoccerapi import FootballSoccerApiProvider


def g(team, minute, own=False, extra=None):
    return GoalEvent(team_id=team, minute=minute, extra=extra, period=1 if minute <= 45 else 2, own_goal=own)


def test_parse_clock():
    assert parse_clock("48'") == (48, None)
    assert parse_clock("45'+4'") == (45, 4)
    assert parse_clock("90'+1'") == (90, 1)
    assert parse_clock("") is None


def test_map_status():
    assert map_status(RawStatusType(name="STATUS_FULL_TIME", state="post", completed=True)) == "finished"
    assert map_status(RawStatusType(name="STATUS_SCHEDULED", state="pre", completed=False)) == "scheduled"
    assert map_status(RawStatusType(name="STATUS_FIRST_HALF", state="in", completed=False)) == "live"
    assert map_status(RawStatusType(name="STATUS_POSTPONED", state="post", completed=False)) == "postponed"


def test_espn_date_key_uses_new_york_time():
    assert espn_date_key("2026-10-03T00:35Z") == "20261002"  # Náutico x Fortaleza, noite de sexta
    assert espn_date_key("2026-10-03T19:00Z") == "20261003"


def test_dedupe_removes_duplicated_goals_only_when_over_score():
    # Vila Nova 2x2 CRB, rodada 1: a ESPN lista os 2 gols do Vila duas vezes,
    # e o Mikael (CRB) fez 2 gols de verdade, com 2 min de diferença.
    goals = [
        (g("crb", 17), "mikael"), (g("crb", 19), "mikael"),
        (g("vila", 48), "della"), (g("vila", 48), "della"),
        (g("vila", 61), "dudu"), (g("vila", 62), "dudu"),
    ]
    out = dedupe_goals(goals, {"vila": 2, "crb": 2})
    assert [(x.team_id, x.minute) for x in out] == [("crb", 17), ("crb", 19), ("vila", 48), ("vila", 61)]


def test_fix_own_goals_flips_when_needed():
    goals = [g("a", 10), g("b", 20, own=True)]  # gol contra atribuído ao time do jogador
    assert [x.team_id for x in fix_own_goals(goals, "a", "b", 2, 0)] == ["a", "a"]
    assert fix_own_goals([g("a", 10)], "a", "b", 2, 0) is None  # lista incompleta


def test_parse_real_round1(teams, rounds, espn_round1):
    p = EspnProvider(teams, rounds, client=object())
    matches, details = {}, {}
    p._collect(RawScoreboard.model_validate(espn_round1), matches, details)
    m = matches["botafogo-sp--fortaleza"]
    assert (m.round, m.status, m.home_goals, m.away_goals) == (1, "finished", 4, 0)
    assert (m.ht_home_goals, m.ht_away_goals) == (3, 0)  # 34', 38', 45+4' no 1º tempo
    d = details["botafogo-sp--fortaleza"]
    assert d.goals_complete and len(d.goals) == 4
    assert all(det.goals_complete for det in details.values())
    assert d.stats["fortaleza"].possession is not None


def test_espn_rejects_changed_format(teams, rounds):
    class Broken:
        calls = 0

        def get_json(self, path, **params):
            return {"eventos": []}

    with pytest.raises(ProviderError):
        EspnProvider(teams, rounds, client=Broken()).fetch(["20260321"])


FSA_ROWS = [
    {"match_id": "mt_1", "home_team_id": "tm_bot", "away_team_id": "tm_for",
     "home_team_name": "Botafogo SP", "away_team_name": "Fortaleza EC",
     "kickoff_utc": "2026-03-21T22:15:00Z", "match_status": "finished",
     "home_goals": 4, "away_goals": 0, "half_time_home_goals": 3, "half_time_away_goals": 0},
    {"match_id": "mt_2", "home_team_id": "tm_nau", "away_team_id": "tm_for",
     "home_team_name": "Náutico", "away_team_name": "Fortaleza EC",
     "kickoff_utc": "2026-10-03T00:35:00Z", "match_status": "scheduled"},
]


class FakeFsaClient:
    calls = 0

    def get_json(self, path, **params):
        self.calls += 1
        return {"data": FSA_ROWS, "meta": {}}


def test_fsa_normalizes_by_team_name(teams, rounds):
    p = FootballSoccerApiProvider(teams, rounds, client=FakeFsaClient())
    ms = {m.id: m for m in p.fetch(None).matches}
    m = ms["botafogo-sp--fortaleza"]
    assert (m.round, m.home_goals, m.away_goals, m.ht_home_goals, m.source) == (1, 4, 0, 3, "footballsoccerapi")
    assert ms["nautico--fortaleza"].status == "scheduled"


def test_fsa_real_free_plan_sample(teams, rounds):
    """Resposta real do plano grátis em 28/09/2026 (só ontem, hoje e próximos jogos).
    Horário vem como timestamp Unix e nomes como 'Fortaleza EC', 'Cuiaba'."""
    import json
    from pathlib import Path

    rows = json.loads((Path(__file__).parent / "fixtures" / "fsa-matches-20260928.json").read_text(encoding="utf-8"))
    ms = {m.id: m for m in FootballSoccerApiProvider(teams, rounds, key="x").normalize(rows)}
    m = ms["fortaleza--athletic-club"]
    assert (m.round, m.status, m.home_goals, m.away_goals, m.ht_home_goals) == (30, "finished", 2, 2, 1)
    assert m.kickoff_utc == "2026-09-27T21:30:00Z"
    assert ms["america-mg--juventude"].status == "scheduled"


def test_fsa_unknown_team_fails(teams, rounds):
    p = FootballSoccerApiProvider(teams, rounds, client=FakeFsaClient())
    with pytest.raises(ProviderError):
        p.team("tm_x", "Clube Inexistente")

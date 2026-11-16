"""Playoffs: jogos da ESPN com id próprio, quando consultar, contas do confronto e retrospectiva."""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pytest

import pipeline.fetch as fetch
from pipeline.calc.model_input import build_model_input
from pipeline.calc.playoffs import LegDist, _need, compute_playoffs, playoff_next_match
from pipeline.calc.retro import compute_retro
from pipeline.calc.standings import compute_standings
from pipeline.calc.timeline import positions_by_round, team_timeline
from pipeline.models import FetchState, Match, PlayoffMatch, SeasonData
from pipeline.outputs import HistoryEntry
from pipeline.providers.espn import EspnProvider, RawScoreboard

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def final_matches():
    return [Match.model_validate(m) for m in json.loads((FIX / "matches-final.json").read_text(encoding="utf-8"))]


@pytest.fixture(scope="module")
def espn_playoff_day():
    return json.loads((FIX / "espn-20261121.json").read_text(encoding="utf-8"))


def _leg(home, away, ko, hg=None, ag=None):
    done = hg is not None
    return PlayoffMatch(id=f"po-{home}--{away}", kickoff_utc=ko, status="finished" if done else "scheduled",
                        home_id=home, away_id=away, home_goals=hg, away_goals=ag, source="espn")


def test_espn_playoff_event_gets_own_id(teams, rounds, espn_playoff_day):
    """Criciúma x Fortaleza da ida não pode virar (e sobrescrever) o jogo da rodada 24."""
    prov = EspnProvider(teams, rounds, client=None)
    sb = RawScoreboard.model_validate(espn_playoff_day)
    parsed = [prov.parse_event(ev) for ev in sb.events]
    games = [m for m, _ in filter(None, parsed)]
    assert {m.id for m in games} == {"po-criciuma--fortaleza", "po-atletico-go--vila-nova"}
    assert all(isinstance(m, PlayoffMatch) for m in games)
    assert "criciuma--fortaleza" in rounds  # o par existe nos pontos corridos (rodada 24)


def test_playoff_dates_discovered_after_table_closes(final_matches):
    season = SeasonData(provider="espn", matches=final_matches)
    now = datetime(2026, 11, 15, 12, tzinfo=timezone.utc)
    state = FetchState(calendar=["20261114", "20261121", "20261128"],
                       date_checked_at={"20261121": "2026-11-12T00:30:17Z", "20261128": "2026-11-12T00:30:17Z"})
    # checadas antes da tabela fechar (só "a definir"): consulta de novo, uma vez
    assert fetch.plan_dates(season, state, now) == ["20261121", "20261128"]
    # com os confrontos conhecidos e longe do jogo: nada a consultar
    season.playoff_matches = [_leg("criciuma", "fortaleza", "2026-11-21T20:00Z"),
                              _leg("fortaleza", "criciuma", "2026-11-28T20:00Z")]
    assert fetch.plan_dates(season, state, now) == []
    # nos 3 dias antes da ida: reconfere horário/estádio, no máximo a cada 12 h
    near = datetime(2026, 11, 19, 12, tzinfo=timezone.utc)
    assert "20261121" in fetch.plan_dates(season, state, near)
    state.date_checked_at["20261121"] = "2026-11-19T06:00:00Z"
    assert fetch.plan_dates(season, state, near) == []


def test_merge_keeps_regular_match_and_adds_playoffs(final_matches):
    cached = SeasonData(provider="espn", matches=final_matches)
    fresh = SeasonData(provider="espn", matches=[],
                       playoff_matches=[_leg("criciuma", "fortaleza", "2026-11-21T20:00Z")])
    merged = fetch.merge(cached, fresh)
    r24 = next(m for m in merged.matches if m.id == "criciuma--fortaleza")
    assert r24.status == "finished" and r24.round == 24
    assert [m.id for m in merged.playoff_matches] == ["po-criciuma--fortaleza"]


def test_need_rule():
    # melhor campanha: empate no placar somado basta
    assert _need(0, True) == 0 and _need(1, True) == -1 and _need(-1, True) == 1
    # pior campanha: precisa somar mais gols
    assert _need(0, False) == 1 and _need(1, False) == 0


def test_leg_distribution_sums_to_one():
    d = LegDist(np.array([1.2, 0.8]), np.array([0.9, 1.5]))
    assert np.allclose(d.margin.sum(axis=1), 1, atol=1e-9)
    assert np.allclose(d.p_margin_at_least(-100), 1) and np.allclose(d.p_margin_at_least(100), 0)


@pytest.fixture(scope="module")
def final_state(teams, final_matches):
    st = compute_standings(teams, final_matches)
    model = build_model_input(sorted(t.id for t in teams), final_matches, st, 38)
    return st, model


def test_compute_playoffs_before_first_leg(final_state, final_matches):
    st, model = final_state
    legs = [_leg("criciuma", "fortaleza", "2026-11-21T20:00Z"), _leg("fortaleza", "criciuma", "2026-11-28T20:00Z")]
    po = compute_playoffs(st, final_matches, legs, {}, model)
    assert po.state == "upcoming"
    f = po.focus
    assert f.opponent_id == "criciuma" and f.better and f.next_leg == 1
    assert 0.5 < f.p_advance < 0.9 and f.p_advance == f.p_advance_start
    assert abs(sum(m.p for m in f.margins) - 1) < 1e-3
    # quanto melhor o resultado da ida, maior a chance de subir
    adv = [m.p_advance for m in f.margins]
    assert adv == sorted(adv)
    # a chance total é a média das chances por resultado da ida
    assert abs(sum(m.p * m.p_advance for m in f.margins) - f.p_advance) < 1e-3
    nxt = playoff_next_match(po, final_matches)
    assert nxt.round == 39 and nxt.leg == 1 and not nxt.home and nxt.venue  # estádio mais usado pelo Criciúma


def test_compute_playoffs_after_first_leg_and_end(final_state, final_matches):
    st, model = final_state
    # Leão venceu a ida por 1: na volta pode perder por 1
    legs = [_leg("criciuma", "fortaleza", "2026-11-21T20:00Z", 1, 2), _leg("fortaleza", "criciuma", "2026-11-28T20:00Z")]
    po = compute_playoffs(st, final_matches, legs, {}, model)
    assert po.state == "between_legs" and po.focus.next_leg == 2
    assert po.focus.p_advance > po.focus.p_advance_start
    by_margin = {m.margin: m.p_advance for m in po.focus.margins}
    assert by_margin[-1] == 1.0 and by_margin[-2] == 0.0
    # placar somado empatado: sobe a melhor campanha
    legs[1] = _leg("fortaleza", "criciuma", "2026-11-28T20:00Z", 0, 1)
    po = compute_playoffs(st, final_matches, legs, {}, model)
    assert po.state == "finished" and po.focus.p_advance == 1.0
    tie = next(t for t in po.ties if t.better_id == "fortaleza")
    assert tie.winner_id == "fortaleza" and (tie.aggregate_better, tie.aggregate_worse) == (2, 2)


def test_no_playoffs_during_regular_season(teams, matches_r30):
    st = compute_standings(teams, matches_r30)
    model = build_model_input(sorted(t.id for t in teams), matches_r30, st, 30)
    assert compute_playoffs(st, matches_r30, [], {}, model) is None


def test_retro_moments(teams, final_matches):
    by_round = positions_by_round(teams, final_matches, 38)
    points = team_timeline("fortaleza", final_matches, by_round)
    history = [HistoryEntry(round=p.round, p_promotion=0.3, p_direct=0.1, p_top6=min(0.9, p.round / 40),
                            position=p.position, points=p.points) for p in points]
    retro = compute_retro("fortaleza", teams, final_matches, points, history, {t.id: t.name for t in teams})
    kinds = [m.kind for m in retro.moments]
    assert kinds[0] == "start" and kinds[-1] == "final"
    assert {"worst", "run", "clinch", "biggest_win"} <= set(kinds)
    assert [m.round for m in retro.moments] == sorted(m.round for m in retro.moments)
    assert retro.clinch_round is not None and retro.clinch_round <= 38

from datetime import datetime, timedelta, timezone

import pytest

import pipeline.fetch as fetch
from pipeline.models import FetchState, SeasonData
from pipeline.providers.base import ProviderError

NOW = datetime(2026, 9, 28, 18, 0, tzinfo=timezone.utc)  # antes de América-MG x Juventude (22:30Z)


@pytest.fixture
def season(matches_r30, details_r30):
    return SeasonData(provider="espn", matches=matches_r30, details=details_r30)


@pytest.fixture
def tmp_data(tmp_path, monkeypatch, season):
    """Isola os arquivos de cache/estado num diretório temporário."""
    monkeypatch.setattr(fetch, "STATE_FILE", tmp_path / "state.json")
    monkeypatch.setattr(fetch, "MATCHES_FILE", tmp_path / "matches.json")
    monkeypatch.setattr(fetch, "DETAILS_FILE", tmp_path / "details.json")
    (tmp_path / "matches.json").write_text(
        "[" + ",".join(m.model_dump_json(by_alias=True) for m in season.matches) + "]", encoding="utf-8"
    )
    return tmp_path


def test_no_cache_means_full_load():
    assert fetch.plan_dates(None, FetchState(), NOW) is None


def test_nothing_due_means_no_call(season):
    assert fetch.plan_dates(season, FetchState(), NOW) == []


def test_due_match_triggers_only_its_date(season):
    later = datetime(2026, 9, 29, 1, 0, tzinfo=timezone.utc)  # 2h30 após 22:30Z
    dates = fetch.plan_dates(season, FetchState(), later)
    assert "20260928" in dates
    assert len(dates) <= 4  # a data do jogo + no máximo os próximos 3 dias


def test_stale_match_rechecked_once_a_day(season):
    much_later = datetime(2026, 10, 1, 1, 0, tzinfo=timezone.utc)
    ame_juv = next(m for m in season.matches if m.id == "america-mg--juventude")
    only = SeasonData(provider="espn", matches=[ame_juv])
    recent = FetchState(date_checked_at={"20260928": fetch.iso(much_later - timedelta(hours=3))})
    assert fetch.due_matches(only.matches, recent, much_later) == []
    old = FetchState(date_checked_at={"20260928": fetch.iso(much_later - timedelta(hours=30))})
    assert len(fetch.due_matches(only.matches, old, much_later)) == 1


class FailingEspn:
    calls = 0
    calendar: list = []

    def fetch(self, dates):
        self.calls += 1
        raise ProviderError("ESPN fora do ar (teste)")


class FakeFallback:
    calls = 0

    def __init__(self, season):
        self.season = season

    def fetch(self, dates):
        self.calls = 1
        ms = [m.model_copy(update={"source": "footballsoccerapi"}) for m in self.season.matches]
        return SeasonData(provider="footballsoccerapi", matches=ms)


def test_fallback_used_and_failures_counted(tmp_data, teams, rounds, season):
    later = datetime(2026, 9, 29, 1, 0, tzinfo=timezone.utc)
    for expected in (1, 2):
        res = fetch.run_fetch(teams, rounds, now=later, espn=FailingEspn(),
                              fallback_factory=lambda: FakeFallback(season))
        assert res.provider_used == "footballsoccerapi"
        assert res.state.espn_consecutive_failures == expected
        fetch.save_state(res.state)
    assert "ESPN fora do ar" in res.state.espn_last_error
    # detalhes (minutos dos gols) vindos da ESPN continuam no resultado mesclado
    assert res.season is not None


def test_both_providers_down_raises_and_keeps_state(tmp_data, teams, rounds):
    class DeadFallback:
        calls = 0

        def fetch(self, dates):
            raise ProviderError("reserva fora do ar (teste)")

    later = datetime(2026, 9, 29, 1, 0, tzinfo=timezone.utc)
    with pytest.raises(ProviderError):
        fetch.run_fetch(teams, rounds, now=later, espn=FailingEspn(), fallback_factory=DeadFallback)
    state = fetch.load_state()
    assert state.espn_consecutive_failures == 1
    assert "reserva" in state.espn_last_error.lower()


def test_espn_success_resets_counter(tmp_data, teams, rounds, season):
    fetch.save_state(FetchState(espn_consecutive_failures=3, espn_last_error="x"))

    class OkEspn:
        calls = 1
        calendar: list = []

        def fetch(self, dates):
            return SeasonData(provider="espn", matches=season.matches)

    later = datetime(2026, 9, 29, 1, 0, tzinfo=timezone.utc)
    res = fetch.run_fetch(teams, rounds, now=later, espn=OkEspn())
    assert res.provider_used == "espn"
    assert res.state.espn_consecutive_failures == 0
    assert res.state.espn_last_error is None

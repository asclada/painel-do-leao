import json
from pathlib import Path

import pytest

from pipeline.models import Match, MatchDetails
from pipeline.providers.base import load_rounds, load_teams

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def teams():
    return load_teams()


@pytest.fixture(scope="session")
def rounds():
    return load_rounds()


@pytest.fixture(scope="session")
def matches_r30():
    """Retrato real da temporada após a 30ª rodada (28/09/2026)."""
    return [Match.model_validate(m) for m in json.loads((FIX / "matches-r30.json").read_text(encoding="utf-8"))]


@pytest.fixture(scope="session")
def details_r30():
    raw = json.loads((FIX / "details-r30.json").read_text(encoding="utf-8"))
    return {k: MatchDetails.model_validate(v) for k, v in raw.items()}


@pytest.fixture
def espn_round1():
    return json.loads((FIX / "espn-20260321.json").read_text(encoding="utf-8"))

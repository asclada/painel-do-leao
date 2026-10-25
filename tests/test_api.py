import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import api.index
from api.index import app, load_model
from pipeline.config import DATA, FORTALEZA_ID
from pipeline.model.types import ModelInput

client = TestClient(app)

# Retrato congelado do modelo depois da 34ª rodada (4 jogos do Leão pela frente). Os testes de comportamento da API
# rodam nele: o workflow testa DEPOIS de atualizar os dados, então nada aqui pode depender da tabela do momento
# (ex.: "vencer tudo dá >99% de acesso direto" deixou de valer com 3 jogos para o fim e travou a atualização).
FIXTURE_MODEL = Path(__file__).parent / "fixtures" / "model-r34.json"


def _use_model(monkeypatch, path: Path) -> ModelInput:
    monkeypatch.setattr(api.index, "MODEL_FILE", path)
    load_model.cache_clear()
    return load_model()


@pytest.fixture(autouse=True)
def _fresh_model_cache():
    load_model.cache_clear()
    yield
    load_model.cache_clear()


@pytest.fixture
def fixture_model(monkeypatch):
    return _use_model(monkeypatch, FIXTURE_MODEL)


def _truncated(tmp_path: Path, games_left: int) -> Path:
    """Retrato com só os `games_left` últimos jogos do Leão pela frente (rodada 37, 38, temporada encerrada)."""
    m = ModelInput.model_validate_json(FIXTURE_MODEL.read_text(encoding="utf-8"))
    focus = [m.remaining[i] for i in m.focus_remaining]
    first_round = focus[-games_left].round if games_left else max(r.round for r in m.remaining) + 1
    remaining = [r for r in m.remaining if r.round >= first_round]
    focus_remaining = [i for i, r in enumerate(remaining) if m.focus_team in (r.home, r.away)]
    path = tmp_path / f"model-{games_left}.json"
    path.write_text(
        m.model_copy(update={"remaining": remaining, "focus_remaining": focus_remaining}).model_dump_json(by_alias=True),
        encoding="utf-8",
    )
    return path


def _p_direct(**params) -> float:
    r = client.get("/api/py/simular", params=params)
    assert r.status_code == 200, r.text
    return r.json()["focus"]["pDirect"]


# --- comportamento da API (retrato congelado) ---


def test_health(fixture_model):
    r = client.get("/api/py/health")
    assert r.status_code == 200 and r.json() == {"ok": True, "round": 34, "games": 4}


def test_all_wins(fixture_model):
    assert _p_direct(p="VVVV") > 0.99


def test_same_choices_same_answer(fixture_model):
    p = "VE-D"
    assert client.get("/api/py/simular", params={"p": p}).json() == client.get(
        "/api/py/simular", params={"p": p}
    ).json()


def test_invalid_input_returns_422(fixture_model):
    assert client.get("/api/py/simular", params={"p": "XYZ"}).status_code == 422
    assert client.get("/api/py/simular", params={"p": "V"}).status_code == 422


def _rival_match(m: ModelInput, team="juventude"):
    t = m.teams.index(team)
    return next(r for r in m.remaining if t in (r.home, r.away) and m.focus_team not in (r.home, r.away))


def test_extra_rival_results_change_the_scenario(fixture_model):
    r = _rival_match(fixture_model)
    base = {"p": "VVDD"}
    free = client.get("/api/py/simular", params=base).json()
    home = client.get("/api/py/simular", params={**base, "x": f"{r.id}:1"}).json()
    away = client.get("/api/py/simular", params={**base, "x": f"{r.id}:2"}).json()
    assert free["extra"] == "" and home["extra"] == f"{r.id}:1" and away["extra"] == f"{r.id}:2"
    assert home["focus"] != away["focus"]
    # mesma pergunta, mesma resposta (cache da CDN)
    assert client.get("/api/py/simular", params={**base, "x": f"{r.id}:1"}).json() == home


def test_extra_rejects_fortaleza_and_unknown_games(fixture_model):
    fort_game = fixture_model.remaining[fixture_model.focus_remaining[0]].id
    assert client.get("/api/py/simular", params={"x": f"{fort_game}:1"}).status_code == 422
    assert client.get("/api/py/simular", params={"x": "time--inexistente:1"}).status_code == 422
    assert client.get("/api/py/simular", params={"x": f"{_rival_match(fixture_model).id}:Z"}).status_code == 422


# --- dados do momento: só regras que valem em qualquer rodada ---


def test_model_file_exists():
    assert api.index.MODEL_FILE.exists()


def test_no_choices_matches_pipeline_simulation():
    sim = json.loads((DATA / "simulation.json").read_text(encoding="utf-8"))
    fort = next(t for t in sim["teams"] if t["teamId"] == FORTALEZA_ID)
    r = client.get("/api/py/simular")
    assert r.status_code == 200
    body = r.json()
    # 5 mil simulações contra 20 mil: no pior caso (chance perto de 50%) o desvio da diferença é ~0,8 ponto, então
    # 0,02 falhava por acaso em ~1% das atualizações. 0,03 fica acima de 3,5 desvios.
    assert abs(body["focus"]["pPromotion"] - fort["pPromotion"]) < 0.03
    assert abs(body["focus"]["pDirect"] - fort["pDirect"]) < 0.03
    assert "s-maxage" in r.headers["cache-control"]


@pytest.mark.parametrize("games_left", [None, 4, 1, 0], ids=["dados-atuais", "4-jogos", "1-jogo", "temporada-encerrada"])
def test_any_round_rules(monkeypatch, tmp_path, games_left):
    m = load_model() if games_left is None else _use_model(monkeypatch, _truncated(tmp_path, games_left))
    n = len(m.focus_remaining)
    if games_left is not None:
        assert n == games_left

    health = client.get("/api/py/health").json()
    assert health["ok"] is True and health["games"] == n

    # vencer tudo nunca dá chance menor que a previsão do modelo, nem esta menor que perder tudo
    wins, free, losses = _p_direct(p="V" * n), _p_direct(), _p_direct(p="D" * n)
    assert wins >= free >= losses

    # escolhas com tamanho errado e jogos que não existem são recusados
    assert client.get("/api/py/simular", params={"p": "V" * (n + 1)}).status_code == 422
    assert client.get("/api/py/simular", params={"x": "time--inexistente:1"}).status_code == 422

    # resultado de rival fixado, quando ainda há jogo de outros times pela frente
    rival = next((r for r in m.remaining if m.focus_team not in (r.home, r.away)), None)
    if rival is not None:
        assert client.get("/api/py/simular", params={"x": f"{rival.id}:1"}).json()["extra"] == f"{rival.id}:1"

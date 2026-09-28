import json

from fastapi.testclient import TestClient

from api.index import MODEL_FILE, app, load_model
from pipeline.config import DATA, FORTALEZA_ID

client = TestClient(app)


def test_health():
    r = client.get("/api/py/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_no_choices_matches_pipeline_simulation():
    sim = json.loads((DATA / "simulation.json").read_text(encoding="utf-8"))
    fort = next(t for t in sim["teams"] if t["teamId"] == FORTALEZA_ID)
    r = client.get("/api/py/simular")
    assert r.status_code == 200
    body = r.json()
    assert abs(body["focus"]["pPromotion"] - fort["pPromotion"]) < 0.02
    assert abs(body["focus"]["pDirect"] - fort["pDirect"]) < 0.02
    assert "s-maxage" in r.headers["cache-control"]


def test_all_wins():
    n = len(load_model().focus_remaining)
    body = client.get("/api/py/simular", params={"p": "V" * n}).json()
    assert body["focus"]["pDirect"] > 0.99


def test_same_choices_same_answer():
    n = len(load_model().focus_remaining)
    p = ("VE-D" * 10)[:n]
    assert client.get("/api/py/simular", params={"p": p}).json() == client.get(
        "/api/py/simular", params={"p": p}
    ).json()


def test_invalid_input_returns_422():
    assert client.get("/api/py/simular", params={"p": "XYZ"}).status_code == 422
    assert client.get("/api/py/simular", params={"p": "V"}).status_code == 422


def test_model_file_exists():
    assert MODEL_FILE.exists()

"""API do simulador "E se?" (função Python na Vercel).

GET /api/py/health          -> acorda a função (o front chama quando o simulador chega na tela)
GET /api/py/simular?p=VVE-D -> chances do Fortaleza com os resultados escolhidos

Lê só data/model.json (gerado pelo pipeline) e usa o MESMO modelo do pipeline
(pipeline/model), para o número do simulador e o do topo nunca divergirem.
"""

from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from pipeline.config import N_SIMS_API  # noqa: E402
from pipeline.model.scenario import run_scenario, validate_choices  # noqa: E402
from pipeline.model.types import ModelInput  # noqa: E402

MODEL_FILE = ROOT / "data" / "model.json"
CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"

app = FastAPI(title="Fortaleza em Números — simulador", docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")


@lru_cache(maxsize=1)
def load_model() -> ModelInput:
    return ModelInput.model_validate_json(MODEL_FILE.read_text(encoding="utf-8"))


@app.get("/api/py/health")
def health():
    m = load_model()
    return {"ok": True, "round": m.last_completed_round, "games": len(m.focus_remaining)}


@app.get("/api/py/simular")
def simular(p: str = Query("", max_length=38, description="V/E/D/- por jogo restante do Fortaleza")):
    model = load_model()
    n_games = len(model.focus_remaining)
    try:
        choices = validate_choices(p or "-" * n_games, n_games)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    result = run_scenario(model, choices, N_SIMS_API)
    body = result.dump()
    body["lastCompletedRound"] = model.last_completed_round
    return JSONResponse(body, headers={"Cache-Control": CACHE})

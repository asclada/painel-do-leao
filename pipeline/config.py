"""Constantes, caminhos e parâmetros do projeto.

Importado pelo pipeline e pela função Python da Vercel: só stdlib aqui.
"""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MANUAL = DATA / "manual"
RAW = DATA / "raw"
LOCAL_CACHE = ROOT / ".cache"  # respostas cruas, só local (gitignored)
CRESTS_DIR = ROOT / "public" / "escudos"  # escudos dos adversários (pipeline/crests.py)

SEASON = 2026
TOTAL_ROUNDS = 38
N_TEAMS = 20
FORTALEZA_ID = "fortaleza"
TIMEZONE = "America/Fortaleza"

# --- Provedores -------------------------------------------------------------

ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2"
ESPN_PAUSE_S = 1.5  # pausa entre chamadas para ser gentil com a ESPN
ESPN_ISSUE_AFTER_FAILURES = 2  # abre issue no GitHub após N falhas seguidas
ESPN_CREST_URL = "https://a.espncdn.com/i/teamlogos/soccer/500/{espn_id}.png"

FSA_BASE = "https://api.footballsoccerapi.com/v1"
FSA_LEAGUE = "lg_1VQKEDM"

GE_BASE = "https://api.globoesporte.globo.com/tabela"
GE_EDITION = "009b5a68-dd09-46b8-95b3-293a2d494366"  # Série B 2026
GE_PHASE = "brasileiro-serie-b-2026-fase-unica"

HTTP_TIMEOUT_S = 30
USER_AGENT = "painel-do-leao/1.0 (+https://github.com/asclada/painel-do-leao)"

# --- Quando consultar -------------------------------------------------------

# Um jogo é considerado "provavelmente encerrado" depois deste tempo do início.
MATCH_DONE_AFTER = timedelta(hours=2, minutes=15)
# Jogos que já deveriam ter acabado há mais que isto e seguem sem resultado
# (atraso da fonte, jogo suspenso) só são reconsultados 1x por dia.
STALE_MATCH_AFTER = timedelta(hours=48)
STALE_RECHECK_EVERY = timedelta(hours=24)

# --- Modelo -----------------------------------------------------------------

SHRINK_GAMES = 4
HALF_LIFE_ROUNDS = 12
LAMBDA_MIN, LAMBDA_MAX = 0.2, 4.0
N_SIMS_PIPELINE = 20_000
N_SIMS_API = 5_000
# Distribuição preditiva bayesiana completa: sorteia a força dos times da posteriori em cada simulação.
# False volta ao modelo antigo (só os valores médios), útil para comparar.
PARAM_UNCERTAINTY = True

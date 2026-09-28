@AGENTS.md

# Painel do Leão

Painel do Fortaleza na Série B 2026, feito para o torcedor comum: posição, chance real de acesso
(simulando o campeonato inteiro, com os rivais), montanha-russa da temporada, corrida pelo acesso,
simulador "E se?" e raio-x. Atualiza sozinho a cada 2h. Plano completo: `docs/PLANO.md` (fonte da verdade).

## Stack e arquitetura

- **Python 3.12 + uv** para tudo que é dado: `pipeline/` (requisições, cálculos, simulação) e `api/` (FastAPI do simulador).
  - `pyproject.toml`: `[project].dependencies` = só o que a função da Vercel usa (fastapi, numpy, pydantic);
    grupos `pipeline` (httpx, tenacity, python-dotenv, tzdata) e `dev` (pytest, uvicorn, httpx). Os cálculos são Python puro (sem pandas).
  - `pipeline/model/`, `pipeline/models.py` e `pipeline/config.py` importam **só numpy + pydantic + stdlib**: vão para a função
    Python da Vercel (`vercel.json` → `includeFiles`). Nada de httpx/dotenv nesses arquivos.
- **Simulação:** `pipeline/model/` (ratings Poisson com mando, encolhimento k=4 e meia-vida 12 rodadas; Monte Carlo
  vetorizado N×M; playoffs). O pipeline roda 20 mil (semente por rodada) e grava `data/simulation.json`; a API
  (`api/index.py`, rotas `/api/py/health` e `/api/py/simular?p=VED-`) roda 5 mil a partir de `data/model.json`.
- **Saídas do site:** `pipeline/outputs.py` (modelos) → `data/*.json` → tipos em `lib/generated/` → `lib/data.ts`.
- **Next.js (App Router) + TypeScript + Tailwind + pnpm** para o site; lê apenas `data/*.json` no build.
- **GitHub Actions** (cron 2h) roda `pipeline/update_data.py`, commita `data/` e a **Vercel** faz deploy.
- A chave da API só existe em `.env.local` (local) e GitHub Secrets. Nunca na Vercel nem no navegador.

## Comandos

- `pnpm dev` — site + FastAPI local juntos (`/api/py/*` é reescrito para a porta 8000)
- `pnpm probe` — sondagem da API → `docs/api-report.md`
- `pnpm update-data` — pipeline completo (`-- --force` consulta mesmo sem jogo novo)
- `pnpm test` — pytest · `pnpm check` — tsc + pytest
- `pnpm gen:types` — pydantic → JSON Schema → `lib/generated/*.ts`
- `pnpm gen:requirements` — exporta as dependências do projeto (só as da API) para `requirements.txt` (Vercel)
- `uv run python -m pipeline.update_data --recompute` — recalcula todas as saídas do cache, sem consultar a fonte
- No Windows, o `uv` fica em `%APPDATA%\Python\Python312\Scripts` (já adicionado ao PATH do usuário).

## Regras

- UI 100% em pt-BR, sem termos técnicos ("chance", não "probabilidade"). Código em inglês, commits em pt-BR.
- Nunca commitar/pushar sem confirmação explícita do Lucas. Sem menção a Claude/Anthropic em commits.
- Fatos escritos à mão (marcos, técnicos, regulamento) precisam ser pesquisados e confirmados pelo Lucas.
- Cron do GitHub é desativado após 60 dias sem atividade no repo (durante o campeonato não acontece por causa dos commits automáticos).

## Decisões tomadas (detalhes: bloco "Decisão tomada em 28/09/2026" na seção 5 do PLANO)

- **Fonte principal: API pública da ESPN** (`/scoreboard?dates=YYYYMMDD`, sem chave, não oficial). Traz placar,
  gols com minuto, cartões, estatísticas e o calendário. Datas no fuso de Nova York.
- **Reserva: footballsoccerapi.com** (50 chamadas/dia; plano grátis só lista ontem/hoje/próximos jogos, sem minuto dos
  gols nem estatísticas). Fallback automático em `pipeline/fetch.py`: nunca sobrescreve jogo encerrado vindo da ESPN.
  Chave em `.env.local` e no secret `FOOTBALL_API_KEY` do repo.
- **Gentileza com a ESPN:** só consulta quando um jogo já deveria ter terminado (início + 2h15), decidido pelo cache,
  sem chamada. Pausa 1,5s, retry com backoff. Nunca rodar carga completa à toa (~133 chamadas).
  Para reprocessar em dev, use `uv run python -m pipeline.update_data --offline` (lê `.cache/`, zero chamadas).
- **Aviso:** 2 falhas seguidas da ESPN → o workflow abre issue com label `fonte-de-dados` (fecha sozinha ao voltar).
- **IDs canônicos:** time = slug (`fortaleza`); jogo = `"{mandante}--{visitante}"`. Rodada vem de
  `data/manual/rounds.json` (gerado de ge.globo por `pipeline/build_reference.py`; a API da CBF exige token, não usar).
- ESPN duplica alguns gols: `dedupe_goals` só remove duplicatas quando a soma passa do placar. Cartões da ESPN diferem
  da CBF em 1–3 por time (só afeta os critérios 6 e 7 de desempate).
- Cores dos clubes em `data/manual/teams.json` são curadoria e aguardam confirmação do Lucas.
- **Playoffs (regulamento confirmado):** melhor campanha faz a volta em casa; empate no agregado → sobe a melhor
  campanha (sem pênaltis).
- Marcos manuais em `data/manual/milestones.json`: só aparecem com `confirmed: true` (ou `showUnconfirmed` durante o
  preview). **Antes do lançamento, trocar para `confirmed` após o Lucas validar (M8).**
- Vercel: projeto `ascladas-projects/painel-do-leao`, ligado ao GitHub (push na main = deploy de produção).
  Produção: https://painel-do-leao.vercel.app. `.vercelignore` impede enviar `.env*` em deploy pela CLI.

## Como descobrir o estado atual

- Fonte usada e flags: `data/meta.json` (`provider`, `hasGoalMinutes`, `lastCompletedRound`).
- Saúde da ESPN: `data/raw/state.json` (`espnConsecutiveFailures`, `espnLastError`) e `gh issue list --label fonte-de-dados`.
- O que a footballsoccerapi entrega: `docs/api-report.md` (gerado por `pnpm probe`).
- Rodada/dados atuais: `data/meta.json`. Features ligadas/desligadas: flags em `data/meta.json`.
- Andamento do roteiro: seção 17 de `docs/PLANO.md` + `git log --oneline`.
- Execuções do cron: `gh run list --workflow update-data.yml`.

_Última atualização: 28/09/2026 (Dias 0 e 1 concluídos: dados, modelo, API e página provisória no ar)._

@AGENTS.md

# Painel do Leão

Painel do Fortaleza na Série B 2026, feito para o torcedor comum: posição, chance real de acesso
(simulando o campeonato inteiro, com os rivais), montanha-russa da temporada, corrida pelo acesso,
simulador "E se?" e raio-x. Atualiza sozinho a cada 2h. Plano completo: `docs/PLANO.md` (fonte da verdade).

## Stack e arquitetura

- **Python 3.12 + uv** para tudo que é dado: `pipeline/` (requisições, cálculos, simulação) e `api/` (FastAPI do simulador).
  - Grupos no `pyproject.toml`: `api` (fastapi, numpy, pydantic), `pipeline` (httpx, tenacity, pandas, python-dotenv), `dev` (pytest, uvicorn).
  - `pipeline/model/` importa **só numpy + pydantic** (vai para a função Python da Vercel). Nunca pandas lá.
- **Next.js (App Router) + TypeScript + Tailwind + pnpm** para o site; lê apenas `data/*.json` no build.
- **GitHub Actions** (cron 2h) roda `pipeline/update_data.py`, commita `data/` e a **Vercel** faz deploy.
- A chave da API só existe em `.env.local` (local) e GitHub Secrets. Nunca na Vercel nem no navegador.

## Comandos

- `pnpm dev` — site + FastAPI local juntos (`/api/py/*` é reescrito para a porta 8000)
- `pnpm probe` — sondagem da API → `docs/api-report.md`
- `pnpm update-data` — pipeline completo (`-- --force` consulta mesmo sem jogo novo)
- `pnpm test` — pytest · `pnpm check` — tsc + pytest
- `pnpm gen:types` — pydantic → JSON Schema → `lib/generated/*.ts`
- `pnpm gen:requirements` — exporta o grupo `api` para `requirements.txt` (Vercel)
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

## Como descobrir o estado atual

- Fonte usada e flags: `data/meta.json` (`provider`, `hasGoalMinutes`, `lastCompletedRound`).
- Saúde da ESPN: `data/raw/state.json` (`espnConsecutiveFailures`, `espnLastError`) e `gh issue list --label fonte-de-dados`.
- O que a footballsoccerapi entrega: `docs/api-report.md` (gerado por `pnpm probe`).
- Rodada/dados atuais: `data/meta.json`. Features ligadas/desligadas: flags em `data/meta.json`.
- Andamento do roteiro: seção 17 de `docs/PLANO.md` + `git log --oneline`.
- Execuções do cron: `gh run list --workflow update-data.yml`.

_Última atualização: 28/09/2026 (Dia 0 + início do Dia 1: provedores, fallback, tabela)._

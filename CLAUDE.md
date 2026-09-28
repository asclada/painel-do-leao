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
- `pnpm update-data` — pipeline completo
- `pnpm test` — pytest · `pnpm check` — tsc + pytest
- `pnpm gen:types` — pydantic → JSON Schema → `lib/generated/*.ts`
- `pnpm gen:requirements` — exporta o grupo `api` para `requirements.txt` (Vercel)
- No Windows, o `uv` fica em `%APPDATA%\Python\Python312\Scripts` (já adicionado ao PATH do usuário).

## Regras

- UI 100% em pt-BR, sem termos técnicos ("chance", não "probabilidade"). Código em inglês, commits em pt-BR.
- Nunca commitar/pushar sem confirmação explícita do Lucas. Sem menção a Claude/Anthropic em commits.
- Fatos escritos à mão (marcos, técnicos, regulamento) precisam ser pesquisados e confirmados pelo Lucas.
- Cron do GitHub é desativado após 60 dias sem atividade no repo (durante o campeonato não acontece por causa dos commits automáticos).

## Decisões tomadas

- Provedor preferencial: footballsoccerapi.com. **Plano grátis: 50 chamadas/dia**, `/matches` e `/matches/{id}` liberados,
  `/matches/{id}/events` (gols com minuto) só no plano pago → provável `hasGoalMinutes: false`.
- Detalhes em lote: `/v1/matches?ids=a-b-c` aceita até 50 ids, mas estatísticas por time só vêm no detalhe individual.

## Como descobrir o estado atual

- O que a API entrega: `docs/api-report.md` e amostras em `docs/api-samples/`.
- Rodada/dados atuais: `data/meta.json`. Features ligadas/desligadas: flags em `data/meta.json`.
- Andamento do roteiro: seção 17 de `docs/PLANO.md` + `git log --oneline`.
- Execuções do cron: `gh run list --workflow update-data.yml`.

_Última atualização: 28/09/2026 (Dia 0)._

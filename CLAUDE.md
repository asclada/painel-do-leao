@AGENTS.md

# Fortaleza em Números

> Nome escolhido pelo Lucas em 28/09/2026 (o projeto nasceu como "Painel do Leão"; o repositório e o projeto na
> Vercel continuam com o slug `painel-do-leao`).

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
  vetorizado N×M; playoffs). **Distribuição preditiva bayesiana completa (29/09, decisão do Lucas):** o encolhimento é
  a média de uma posteriori Gamma-Poisson; `fit_ratings` exporta essa posteriori (`ratings.posterior` no model.json) e
  `draw_factors` sorteia a força de cada time em cada simulação (inclusive nos playoffs). `PARAM_UNCERTAINTY` em
  `pipeline/config.py` liga/desliga (False = modelo antigo, só as médias). Vale para TODOS os números do site. O pipeline roda 20 mil (semente por rodada) e grava `data/simulation.json`; a API
  (`api/index.py`, rotas `/api/py/health` e `/api/py/simular?p=VED-`) roda 5 mil a partir de `data/model.json`.
- **Saídas do site:** `pipeline/outputs.py` (modelos) → `data/*.json` → tipos em `lib/generated/` → `lib/data.ts`.
- **Backtest e calibração (Pacote 1, 29/09):** `pipeline/calc/backtest.py` refaz a simulação "depois da rodada r"
  (só jogos das rodadas 1..r, 10 mil simulações, semente fixa) e guarda em `data/backtest.json` com chave por rodada
  (hash dos jogos + parâmetros; `BACKTEST_VERSION` força recalcular tudo). Execução normal só calcula a rodada nova
  (~2 s; tudo do zero ~30 s). `data/history.json` = Fortaleza por rodada; o último ponto é sempre a chance de agora
  (20 mil, a do topo), com `partial` se a rodada está em andamento. `pipeline/calc/calibration.py` compara as
  previsões V/E/D da rodada seguinte com o resultado → `data/calibration.json` (frase leiga no rodapé) e
  `docs/CALIBRACAO.md` (gerado; o workflow commita). Calibração da temporada só quando os pontos corridos acabarem.
- **Jogos que mais mexem (Pacote 1, corrigido em 29/09):** `pipeline/calc/key_games.py` simula cada jogo com o
  resultado FIXADO (V/E/D) com a MESMA semente do topo; a reamostragem do jogo fixado usa gerador próprio
  (`sample_scores(rng_fix=...)`) e os playoffs tiram os gols de uniformes sorteados antes (`poisson_from_uniform`),
  então os cenários só diferem naquele jogo (comparação pareada, ruído ~0,15 ponto). NÃO voltar a separar as
  simulações do topo por resultado: o ruído (~0,8) era maior que o efeito e sugeriu empate em Londrina x Criciúma.
  "Pra secar" avalia TODOS os jogos até a rodada do próximo jogo do Leão (não só a lista da corrida), guarda a ordem
  dos 3 resultados e `sameTop/sameBottom` (< 1 ponto = "tanto faz"; o site diz "Torça contra X"). ~45 s por execução.
- **Ideias do Chance de Gol (29/09, pedido do Lucas):** (1) `next-match.json → chances` (V/E/D do Leão no próximo
  jogo, `outcome_probs`, sem sorteio de placar) no card do próximo jogo; (2) calibração com favorito/médio/zebra e
  a "medida de confiabilidade" deles (`docs/CALIBRACAO.md` + frase no rodapé); (3) `pipeline/calc/clinch.py` →
  `simulation.clinch`: garantido/eliminado na matemática (conservador: empate em pontos = em aberto). O site usa
  `lib/clinch.ts::chanceLabel`: 100%/0% só com a matemática; senão ">99%"/"<1%". Selo no topo (`clinchBadge`).
- **Pacote 2 (29/09):** desafio 100% na URL (`lib/challenge.ts`): `a`/`ap` = desafiante, `b`/`bp` = quem respondeu;
  previsão = rodada inicial + um V/E/D por rodada até a 38 (mapeada por RODADA, não por posição). Placar = acertos
  nos jogos já disputados a partir da previsão mais recente dos dois; o duelo só mostra essas rodadas.
  Componentes em `components/simulator/Challenge.tsx` (apelido lembrado em localStorage `fen:apelido`) e
  `RivalGames.tsx` (confrontos diretos opcionais → `?x=`, API `x=mandante--visitante:1|X|2`, `parse_extra` em
  `pipeline/model/scenario.py`; sem `x` a semente é a mesma de antes). Cards novos: `/api/card/duelo`,
  `/api/card/provocacao`, `/api/card/curiosidade?t=`, `/api/card/proximo-jogo` (escudos embutidos via
  `lib/og/crests.ts`). Persona da previsão: `predictionPersona` em `lib/simulator-text.ts`. Curiosidades:
  `lib/curiosities.ts`; "Conteúdo da rodada" em `components/content/RoundContent.tsx`.
  Para testar o simulador localmente: `.claude/launch.json` → `dev` (site + FastAPI).
- **Dados atrasados:** `meta.dataStatus` (`pipeline/fetch.py::data_status`): `delayed` só com ESPN falhando ≥2x E
  jogo que já deveria ter acabado sem resultado; não mexe no `updatedAt`. Banner em `components/DataStatusBanner.tsx`.
- **Front:** tokens de cor/fonte em `app/globals.css` (Tailwind v4 `@theme`), fontes em `lib/fonts.ts`, nome do site em
  `lib/site.ts` (inclui `SITE_URL`). Seções em `components/`, nesta ordem na página: hero F1, campaign (+ quiz
  `RoundOneQuiz` "onde o Leão estava na rodada 1"), season-chart F2 + `MatchList` "jogo a jogo", chance ("Como a
  chance mudou", SVG próprio + "A conta mudou", `lib/chance.ts`), race F3, key-games ("jogos que mais mexem" +
  "Pra secar"), simulator F4, projection "Até a rodada 38", xray F5 com "depois do intervalo".
  O topo diz "Situação atual na Série B · N jogos" (não "depois da rodada X", que confundia com rodada em andamento).
  Campanha em números: `CampaignStats` (aproveitamento, V/E/D, média, saldo; recorte todos/casa/fora) lê
  `standings.json`. "Até a rodada 38": faixa de 80% dos pontos (`pointsP10`–`pointsP90`), histograma
  `simulation.focusPoints`, chance de G6 e risco de rebaixamento ("praticamente zero" abaixo de 1%).
  O Recharts do F2 é carregado sob demanda (`SeasonChartPlot.tsx` via `next/dynamic`) para o Lighthouse mobile ficar ≥ 90.
  Relógio do cliente via `lib/useNow.ts` (useSyncExternalStore) — não usar setState em efeito para "agora".
- **Simulador (F4, "Simulador dos próximos jogos"):** `components/simulator/` + `lib/simulator-client.ts` (debounce
  400ms, AbortController, cache em memória, aquecimento de `/api/py/health`) + `lib/simulator-text.ts` (frases).
  **Sem sorteio (pedido do Lucas, 29/09):** o painel "Onde o Leão termina" fica bloqueado até V/E/D em TODOS os jogos;
  sem atalhos de "tudo vitória". O card `/api/card/previsao` também exige todas as escolhas (400 se faltar).
  A frase de pontos (`pointsPhrase`) compara os pontos finais da previsão com as marcas do cenário geral
  (`simulation.magic`: pontos para >90% de acesso direto e de G6); não usar o `magic` da resposta da API, que com
  todos os jogos fixados vira o próprio total. No painel oculto do navegador de testes o simulador não hidrata
  (React adia o Suspense com a aba em segundo plano): tire uma captura de tela antes de testar.
  Jogos vêm de `data/model.json` no build (`focusFixtures` em `lib/data.ts`); escolhas em `?p=`.
- **Card do próximo jogo:** escudos dos dois times na ordem mandante/visitante, do mesmo tamanho (pedido do Lucas,
  29/09), e sempre o `assets/escudo-fortaleza.png` para o Fortaleza. Selo azul "Próximo jogo • Rodada X". Escudos dos adversários em `public/escudos/{time}.png`, baixados
  da ESPN por `pipeline/crests.py` (só os que faltam; fundo transparente garantido; roda dentro do `update_data` e o
  workflow commita `public/escudos/`). Estádio sempre como "Estádio: {nome popular}" (`venueName` em `lib/format.ts`);
  sem estádio na ESPN, usa o estádio mais usado pelo mandante (`usual_venue` em `pipeline/calc/next_match.py`).
- **Corrida (F3):** sem frase de destaque na página (pedido do Lucas); o pipeline ainda gera `race.headline`.
- **Imagens (next/og):** `lib/og/cards.tsx` (cards de story e Open Graph) e `lib/og/fonts.ts` (fontes WOFF em
  `assets/fonts`, OFL, incluídas via `outputFileTracingIncludes`). Satori: todo `div` com mais de um filho precisa de
  `display: flex`, e número puro como filho quebra (use template string/`String()`).
  Rotas: `/api/card/acesso`, `/api/card/conta` ("A conta mudou"), `/api/card/previsao?p=`, `app/opengraph-image.tsx`, `twitter-image`, `apple-icon`, `icon.svg`.
- **Escolhas visuais do Lucas (checkpoints 1 e 2, 28/09):** nome **Fortaleza em Números**; Bebas Neue + Inter;
  derrota = bolinha vermelha; **chance de subir em verde** em todo o site (topo, simulador, corrida, cards, preview
  do link), com o selo azul "Chances aproximadas do Leão subir pra Série A" no topo (pedido do Lucas, 29/09); montanha-russa com linha
  **branca** e pontos verde (V) / cinza (E) / vermelho (D), faixas G2/G6 preenchidas e Z4 hachurada.
  **Checkpoint 3 (29/09):** card "Chance de acesso" opção A (Placar) e card "Minha previsão" opção A (Lista); a rota
  `/preview` foi removida depois da escolha.
- **Escudo:** por decisão do Lucas (29/09), o topo usa o **primeiro escudo oficial** do Fortaleza (`assets/escudo-fortaleza.png`,
  fundo removido a partir de `D:\painel-do-leao\assets\escudo-fec.jpg`), com um resumo curto do site ao lado.
  Os badges dos outros clubes continuam só com a sigla; o favicon é original (barras tricolores).
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
- Nunca "sorteio"/"sorteia" na interface (pedido do Lucas, 29/09): passa a ideia de resultado aleatório. Falar em
  "previsão do modelo" / "chances pela força dos times" (jogos sem escolha no simulador seguem a previsão do modelo).
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
- Marcos manuais em `data/manual/milestones.json`: só aparecem com `confirmed: true`. Troca de técnico confirmada pelo
  Lucas: rodada 20 com interino, **Autuori estreou na rodada 21**.
- Vercel: projeto `ascladas-projects/painel-do-leao`, ligado ao GitHub (push na main = deploy de produção).
  Produção: **https://fortaleza-em-numeros.vercel.app** (domínio principal; https://painel-do-leao.vercel.app também responde). `.vercelignore` impede enviar `.env*` em deploy pela CLI.

## Como descobrir o estado atual

- Fonte usada e flags: `data/meta.json` (`provider`, `hasGoalMinutes`, `lastCompletedRound`).
- Saúde da ESPN: `data/raw/state.json` (`espnConsecutiveFailures`, `espnLastError`) e `gh issue list --label fonte-de-dados`.
- O que a footballsoccerapi entrega: `docs/api-report.md` (gerado por `pnpm probe`).
- Rodada/dados atuais: `data/meta.json`. Features ligadas/desligadas: flags em `data/meta.json`.
- Andamento do roteiro: seção 17 de `docs/PLANO.md` + `git log --oneline`.
- Execuções do cron: `gh run list --workflow update-data.yml`.

## Próximos passos

- Dia 4 (`docs/PROXIMOS-PASSOS.md`) implementado em 29/09 com as 5 decisões sugeridas: campanha em números, "Até a
  rodada 38", modelo bayesiano completo, jogo a jogo e "depois do intervalo".
- **Fase atual: `docs/ROADMAP.md`** (pacotes 1 a 4: participação da torcida). Pacote 1 implementado em 29/09
  (status no próprio ROADMAP); pacote 2 implementado em 29/09; próximo: pacote 3.
- README de portfólio na raiz: descrever o modelo como "Poisson com incerteza nas forças dos times" (não
  "bayesiano completo").
- Pendente do Lucas: testes no celular (M10) e revisão dos textos (M11).

_Última atualização: 29/09/2026 (Pacote 2: desafio do Leão e duelo, provocação modelo x eu, persona da previsão,
confrontos diretos no simulador, cards de curiosidade e do próximo jogo, "Conteúdo da rodada")._

# Próximos passos — "Dia 4": campanha em números e cenários até a rodada 38

> Preparado em 29/09/2026 a pedido do Lucas, depois de comparar o site com o painel do Náutico
> (https://xkegbqgnf8ghsf2vhqyjy8.streamlit.app/, de Pablo Melo, a inspiração do projeto).
> **Status (29/09/2026): implementado.** O Lucas aprovou as 5 decisões sugeridas na seção 5 e pediu que o modelo
> bayesiano completo valha para todos os números do site. Fases A, B, C e os extras 1 e 2 estão no ar; extras 3 e 4
> ficaram de fora. Antes/depois do modelo: chance de acesso do Fortaleza 64,9% → 62,2% (rodada 29).

## 1. O que o Lucas pediu

| # | Incremento | Exemplo com os dados de hoje (rodada 29, 30 jogos) |
|---|---|---|
| 1 | Aproveitamento geral em % + "X pontos de Y possíveis" | 58% · 52 de 90 pontos possíveis |
| 2 | Campanha V/E/D | 14 vitórias, 10 empates, 6 derrotas |
| 3 | Média de pontos por jogo | 1,73 ponto por jogo (máximo 3,00) |
| 4 | Risco de rebaixamento | praticamente zero (<1%) |
| 5 | Faixa mais provável de pontuação (distribuição preditiva bayesiana, por mando, usando também os jogos dos outros 19 times) | 60 a 69 pontos em 80% dos cenários, centro em 65 |

Tudo precisa se atualizar sozinho, igual ao resto do site (cron de 2h → `pipeline/update_data.py` → `data/*.json` → deploy).

## 2. O que já temos pronto (a maior parte do trabalho já existe)

- **Itens 1, 2 e 3:** tudo já está em `data/standings.json` (linha do Fortaleza: `played`, `wins`, `draws`,
  `losses`, `points`, `pct`, e o recorte `home`/`away`). "Pontos possíveis" = `played × 3`; média = `points / played`.
  É só front-end. Já se atualiza a cada rodada.
- **Item 4:** o modelo já calcula `pRelegation` (terminar entre 17º e 20º) para todos os times em
  `data/simulation.json`, simulando o campeonato inteiro com os rivais. Só não aparece na página.
  Diferença para o Náutico: lá o risco usa um corte fixo ("44 pontos ou menos"); aqui é a posição final real
  em cada simulação, com os 20 times.
- **Item 5:** `simulation.json` já tem `pointsP10`, `pointsP50` e `pointsP90` do Fortaleza (faixa de 80% e centro).
  O modelo **já usa os jogos dos outros 19 times e separa por mando**: `pipeline/model/ratings.py` estima ataque e
  defesa de cada clube em casa e fora com todos os jogos da Série B, e cada jogo restante é sorteado contra o
  adversário real. Isso é exatamente o "cenário mais realista" pedido, e vai além do painel do Náutico, que admite
  não ter os jogos dos outros clubes e usa metas fixas (60/65/44 pontos) e 50% nos playoffs.

### Onde entra o "bayesiano"

A fórmula de força com encolhimento (`k = 4` jogos fictícios na média da liga) **é a média a posteriori de um modelo
Gamma-Poisson**: o prior é a média da liga e os gols do time (com peso maior para jogos recentes) atualizam esse prior.
Hoje o simulador usa só essa média (um valor por time). A versão bayesiana completa, a **distribuição preditiva**,
sorteia a força de cada time a partir da posteriori em cada uma das 20 mil simulações. Assim entra também a incerteza
sobre "quão bom o time realmente é", e não só a sorte dos jogos. Na prática:

- a faixa de pontos fica um pouco mais larga e mais honesta (hoje 60–69; deve ir para algo como 59–70);
- as chances do topo mudam pouco, puxadas levemente para o meio (ex.: 65% pode virar 62–64%);
- o simulador "E se?" continua coerente porque usa o mesmo modelo.

## 3. Plano de implementação

### Fase A — Campanha em números (itens 1–4) · ~1h30

1. `components/campaign/CampaignStats.tsx` (servidor): 4 números com a regra de ouro "até 3 números por bloco":
   - **Aproveitamento** `58%` + "52 de 90 pontos possíveis";
   - **Campanha** `14 V · 10 E · 6 D` (bolinhas verde/cinza/vermelha, mesmas cores do site);
   - **Média por jogo** `1,73` + "de no máximo 3,00";
   - **Risco de rebaixamento** `pct(pRelegation)`; abaixo de 1% mostrar "praticamente zero".
   Formatação: `lib/format.ts` (`pct`, `plural`; criar `decimal(n, 2)` com vírgula).
2. Dados: `lib/data.ts` já exporta `fortalezaRow` e `fortalezaOdds`. Nenhuma mudança no pipeline.
3. Recorte **Todos / Em casa / Fora** (como no Náutico): opcional, usa `fortalezaRow.home/away` (dá para fazer
   com três botões `aria-pressed`, sem chamada nova).
4. Posição na página: ver decisão 5.1.

### Fase B — Faixa mais provável (item 5, sem mudar o modelo) · ~45min

1. Pipeline: adicionar a `TeamOdds` (em `pipeline/model/summarize.py`) um histograma compacto dos pontos finais,
   `pointsDist: {min: int, probs: float[]}`, para o mini gráfico. Rodar `pnpm gen:types` depois.
2. Front: bloco "Faixa mais provável" com "**60 a 69 pontos** · em 80% dos cenários o Leão termina nessa faixa;
   o centro é 65", mais o mini histograma (reaproveitar o estilo de `components/simulator/PositionBars.tsx`),
   com marcas verticais nas "marcas" do simulador (`simulation.magic.pointsFor90Direct` e `pointsFor90Top6`).
3. "Como calculamos?" (`components/Footer.tsx`): uma frase explicando a faixa de 80%.

### Fase C — Modelo bayesiano completo (preditiva) · ~3h a 4h

1. `pipeline/model/ratings.py`: além dos fatores, exportar os parâmetros da posteriori de cada fator
   (forma = gols ponderados + k·μ; taxa = (jogos ponderados + k)·μ), em `Ratings` (`pipeline/model/types.py`),
   para irem no `data/model.json` (a FastAPI lê daí).
2. `pipeline/model/simulate.py`: nova função `draw_factors(ratings, n, rng)` que sorteia N×20 valores de cada
   fator com `rng.gamma(forma, 1/taxa)`; `expected_goals` passa a devolver λ com formato N×M (uma força por
   simulação). Ajustar `sample_scores` (a reamostragem dos resultados fixados usa `lam[rows, c]`) e
   `pipeline/model/playoffs.py` (λ por simulação também nos playoffs).
3. Chave em `pipeline/config.py`: `PARAM_UNCERTAINTY = True`, para comparar antes/depois e voltar atrás fácil.
4. Testes (`tests/test_model.py`): somas de sanidade (8.6 do PLANO), semente fixa = mesmo resultado,
   "tudo vitória" ≈ 100% direto, desempenho (**5 mil simulações < 300ms** na API; medir, o sorteio gamma custa
   algo), e um teste novo: com incerteza, o desvio dos pontos finais é ≥ ao sem incerteza.
5. Rodar `uv run python -m pipeline.update_data --recompute` e **mostrar ao Lucas a tabela antes/depois**
   (chance de acesso, direto, G6, rebaixamento e faixa de pontos de cada time da corrida) antes de publicar.
6. Atualizar o texto do "Como calculamos?" e a seção 8 do `docs/PLANO.md`.

### Atualização automática

Nada muda no cron: as Fases A e B leem `standings.json` e `simulation.json`, que o workflow já regenera a cada
jogo novo; a Fase C muda só o cálculo dentro do mesmo pipeline e o `model.json` que a API já lê.

## 4. Outras ideias boas do painel do Náutico (opcionais)

1. **Jogo a jogo — a campanha completa:** lista das 30 partidas (rodada, data, adversário com escudo, casa/fora,
   placar, V/E/D, pontos acumulados), recolhida por padrão ("Ver todos os jogos"). Temos tudo em
   `data/matches.json` e `data/timeline.json`. ~1h. **Recomendo**: é o que o torcedor mais procura depois da tabela.
2. **O que muda depois do intervalo:** em quantos jogos o Leão terminou melhor/pior do que estava no intervalo e o
   saldo de pontos dessas viradas (temos o placar do intervalo). Encaixa no bloco "1º tempo x 2º tempo" do Raio-X.
   ~45min.
3. **Rendimento por blocos de 10 rodadas** (1–10, 11–20, 21–30): complementa o "turno x returno". ~30min.
4. **Evolução dos pontos contra um "ritmo"** (ex.: ritmo do G2 ou do G6 a cada rodada): parecido com a
   montanha-russa; só vale se for como linha opcional no gráfico que já existe.

O que **não** vale copiar: metas fixas de pontos (60/65/44) e 50% nos playoffs. O nosso modelo calcula isso com os
rivais e o regulamento real, e é o diferencial do site.

## 5. Decisões do Lucas antes de começar

1. **Onde colocar a "campanha em números"?** Sugestão: uma faixa com os 4 números logo abaixo do topo (antes da
   montanha-russa), porque é contexto básico. Alternativa: primeiro bloco do Raio-X.
2. **Onde colocar a "faixa mais provável"?** Sugestão: nova seção curta "Até a rodada 38" entre a Corrida e o
   Simulador, com a faixa, o mini histograma e o risco de rebaixamento.
3. **Fase C (bayesiano completo) vale para o site todo?** Recomendo **sim**: um modelo só, para o número do topo, a
   faixa e o simulador nunca divergirem. Os números do topo vão mudar um pouco (ver seção 2), e por isso a tabela
   antes/depois vem antes do commit.
4. **Risco de rebaixamento perto de zero:** mostrar "praticamente zero" (sugestão) ou esconder o card enquanto for
   menor que 1%?
5. **Extras da seção 4:** quais entram (sugestão: 1 e 2)?

## 6. Ordem sugerida e estimativa

| Ordem | Fase | Tempo | Depende de |
|---|---|---|---|
| 1 | A — Campanha em números | ~1h30 | decisões 5.1 e 5.4 |
| 2 | B — Faixa mais provável (modelo atual) | ~45min | decisão 5.2 |
| 3 | C — Preditiva bayesiana completa | ~3h a 4h | decisão 5.3 + aprovação da tabela antes/depois |
| 4 | Extras (jogo a jogo, intervalo) | ~1h45 | decisão 5.5 |

Total: cerca de meio dia a um dia de trabalho, com commits separados por fase (cada um aprovado pelo Lucas).

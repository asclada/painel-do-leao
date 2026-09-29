# Fortaleza em Números

Painel do Fortaleza na Série B 2026 feito para o torcedor comum: onde o Leão está, qual a chance real de subir
para a Série A (simulando o campeonato inteiro, com todos os rivais), como essa chance mudou rodada a rodada, quais
jogos mais pesam e um simulador para montar a própria previsão. Atualiza sozinho depois de cada jogo.

**No ar:** https://fortaleza-em-numeros.vercel.app

[![Prévia do site](https://fortaleza-em-numeros.vercel.app/opengraph-image)](https://fortaleza-em-numeros.vercel.app)

> Projeto independente de torcedor, sem vínculo com o Fortaleza Esporte Clube.

## O que tem no site

- **Agora:** posição, pontos, sequência e a chance de subir (direto e pelos playoffs), com o próximo jogo e a chance
  de vitória, empate e derrota do Leão nele. Quando a matemática decide algo, aparece um selo ("Acesso garantido!",
  "Vaga no G6 garantida"...).
- **Campanha em números:** aproveitamento, vitórias/empates/derrotas, média de pontos, saldo (geral, casa e fora).
- **Montanha-russa da temporada:** posição rodada a rodada, com marcos e os rivais da corrida; jogo a jogo.
- **Como a chance mudou:** a chance de acesso refeita depois de cada rodada, só com o que se sabia até ali, e o
  card **"A conta mudou"** (antes x agora) gerado automaticamente depois de cada rodada.
- **Corrida pelo acesso:** os times da briga lado a lado, com a dificuldade da tabela que falta.
- **Os jogos que mais mexem na chance:** quanto a chance muda se o Leão vencer, empatar ou perder cada jogo, e
  **"Pra secar nesta rodada"**: os três resultados de cada jogo da rodada, do que mais ajuda o Leão para o que mais
  atrapalha ("Torça pelo X · se não der, o empate serve" ou "Torça contra Y").
- **Simulador dos próximos jogos:** o torcedor escolhe V/E/D em cada jogo e vê onde o Leão termina (API em Python),
  com uma "cara" para a previsão ("Fé inabalável", "Vai ser nos playoffs"...) e, se quiser, também os confrontos
  diretos entre os rivais.
- **Desafio do Leão:** a previsão vira um link com apelido; o amigo faz a dele sem ver a primeira e os dois
  aparecem lado a lado, com placar de acertos que se atualiza a cada jogo. Tudo no link, sem cadastro nem banco.
- **Até a rodada 38:** pontuação mais provável, faixa de pontos e as marcas que deixam G6 e acesso quase garantidos.
- **Raio-X:** casa x fora, turno x returno, gols por faixa de minuto, o que muda depois do intervalo; cada
  curiosidade vira um card para compartilhar.
- **Conteúdo da rodada:** cards prontos para postar depois de cada jogo (chance de acesso, a conta mudou, próximo
  jogo com os escudos e as chances, curiosidade da vez).
- **Cards para compartilhar** (story 1080×1920 e prévia de link), gerados no servidor: chance de acesso, minha
  previsão, modelo x eu, duelo, próximo jogo, curiosidades.

## Arquitetura

```
GitHub Actions (a cada 2h)
  └─ pipeline/update_data.py (Python 3.12 + uv)
       ├─ busca resultados na ESPN só se algum jogo já deveria ter terminado (reserva: footballsoccerapi)
       ├─ tabela, linha do tempo, raio-x, corrida, próximo jogo
       ├─ 20 mil simulações do campeonato + jogos que mais mexem na chance
       ├─ backtest rodada a rodada (só a rodada nova) + calibração → docs/CALIBRACAO.md
       └─ grava data/*.json e commita
                └─ push na main → Vercel
                     ├─ Next.js (App Router, TypeScript, Tailwind): página estática lida dos JSON no build
                     ├─ next/og: cards de story e Open Graph
                     └─ função Python (FastAPI): /api/py/simular para o simulador (5 mil simulações por cenário)
```

- **Sem banco de dados:** o estado do site são arquivos JSON versionados. O histórico do Git é o histórico dos dados.
- **Um modelo só:** o pipeline e a API do simulador importam o mesmo código (`pipeline/model/`), então o número do
  topo e o do simulador nunca divergem. Esse pacote só depende de numpy e pydantic, para caber na função da Vercel.
- **Tipos de ponta a ponta:** os modelos pydantic viram JSON Schema e depois tipos TypeScript
  (`pnpm gen:types` → `lib/generated/`).

## Como o modelo funciona

É um **modelo de Poisson com mando de campo e incerteza nas forças dos times**:

1. **Força de cada time.** Cada clube tem quatro fatores (ataque e defesa, em casa e fora), estimados pelos gols
   feitos e sofridos de todos os jogos da Série B. Jogos recentes pesam mais (meia-vida de 12 rodadas) e cada fator
   é puxado para a média da liga quando há poucos jogos (encolhimento equivalente a 4 jogos de média).
2. **Incerteza.** Esse encolhimento é a média de uma distribuição Gamma para cada fator. Em vez de usar só a média,
   cada simulação sorteia a força dos times dessa distribuição: a conta leva em conta a sorte dos jogos **e** a
   dúvida sobre o quanto cada time é bom de verdade.
3. **Monte Carlo.** Os jogos restantes de todos os 20 times são simulados 20 mil vezes, de forma vetorizada
   (matriz simulações × jogos, sem laço em Python). A tabela final segue os critérios de desempate do regulamento.
4. **Playoffs.** 3º x 6º e 4º x 5º em ida e volta, com a melhor campanha decidindo em casa e levando no empate do
   agregado, como no regulamento de 2026.
5. **Jogos que mais mexem.** Cada jogo é simulado três vezes com o resultado fixado (vitória, empate, derrota) e a
   mesma semente das simulações do topo. O jogo fixado é re-sorteado com um gerador próprio e os placares dos
   playoffs saem de números sorteados antes de saber quem joga, então o resto do campeonato é idêntico nos três
   cenários e a diferença entre eles é só aquele jogo (comparação pareada). A primeira versão separava as
   simulações do topo pelo resultado de cada jogo; o ruído entre os grupos (~0,8 ponto de chance) era maior que o
   efeito de um ponto a mais para um rival e chegou a sugerir o resultado errado. Com o pareamento, ~0,15.
6. **Garantido ou eliminado na matemática.** Além da simulação, uma conta de pontos (sem sorteio) diz quando uma
   vaga já está garantida ou perdida. O site só mostra 100% ou 0% quando essa conta confirma; perto disso, sem
   certeza, mostra ">99%" ou "<1%".

## Validação (backtest e calibração)

O pipeline refaz a conta como ela teria sido feita **depois de cada rodada**, usando só os jogos disputados até ali
(mesmo modelo, semente fixa por rodada). Com isso:

- o site mostra a linha **"Como a chance mudou"** desde a rodada 1;
- cada rodada prevê os jogos da rodada seguinte, e essas previsões são comparadas com o que aconteceu (Brier
  multiclasse, calibração por faixa, favoritos). O resumo é regenerado automaticamente em
  [`docs/CALIBRACAO.md`](docs/CALIBRACAO.md). Até a rodada 30: favoritos com 56% de chance média venceram 57% das
  vezes, e o modelo foi um pouco melhor que uma referência que só conhece a frequência de mandante/empate/visitante
  da liga (futebol é difícil de prever: o ganho é pequeno, mas as chances são bem calibradas). Também no formato
  do site Chance de Gol: deu o resultado mais provável em 41% dos jogos, o do meio em 33% e a zebra em 26% (a
  Série B é equilibrada);
- quando os pontos corridos terminarem, a chance de G2 e de G6 de cada time em cada rodada também é avaliada contra
  a posição final.

O backtest fica em cache (`data/backtest.json`) com uma chave por rodada (hash dos jogos até ali + parâmetros do
modelo): nas execuções normais só a rodada nova é calculada (~2 s em vez de ~30 s). A execução completa, com os
cenários dos jogos que mais mexem, leva menos de 1 minuto e só roda quando algum jogo terminou.

## Decisões técnicas

- **Gentileza com a fonte.** A ESPN (API pública, sem chave) só é consultada quando um jogo já deveria ter terminado,
  decidido pelos horários em cache, sem nenhuma chamada. Pausa entre chamadas e retry com backoff.
- **Reserva automática.** Se a ESPN falhar, os placares vêm da footballsoccerapi, que nunca sobrescreve um jogo já
  encerrado vindo da ESPN. Duas falhas seguidas abrem uma issue no GitHub (que fecha sozinha quando a fonte volta) e,
  se faltar resultado, o site avisa até quando os dados estão atualizados.
- **Desempenho no celular.** Página estática, gráfico pesado (Recharts) carregado sob demanda, gráfico da chance em
  SVG próprio. Lighthouse mobile em produção: desempenho 94, acessibilidade 100, SEO 100.
- **Linguagem de torcedor.** Tudo em pt-BR, sem termos técnicos na página ("chance", não "probabilidade").
- **Nada manual por rodada.** Todo texto que depende de resultado é gerado pelo pipeline; fatos escritos à mão só
  entram depois de confirmados.

## Limitações

- O modelo só olha gols: não sabe de desfalques, troca de técnico, calendário apertado ou motivação.
- A fonte principal é uma API pública não oficial; o formato pode mudar sem aviso (há testes e o aviso por issue).
- Cartões da ESPN diferem um pouco da CBF, o que só afeta os últimos critérios de desempate.
- Simulações são uma estimativa: futebol tem surpresa.

## Rodando localmente

Pré-requisitos: Node 20+, pnpm, Python 3.12 e [uv](https://docs.astral.sh/uv/).

```bash
pnpm install
uv sync --all-groups
pnpm dev                                           # site + API do simulador (porta 8000)
uv run python -m pipeline.update_data --recompute  # recalcula as saídas a partir dos dados salvos, sem consultar a fonte
pnpm check                                         # tipos (tsc) + testes (pytest)
```

A chave da API reserva (opcional) vai em `.env.local` (veja `.env.example`); nunca no repositório.

## Estrutura

```
pipeline/            coleta, cálculos e modelo (Python)
  model/             ratings, simulação, playoffs, cenários (vai para a função da Vercel)
  calc/              tabela, linha do tempo, raio-x, corrida, backtest, calibração, jogos-chave
  providers/         ESPN e footballsoccerapi
api/index.py         FastAPI do simulador
app/, components/    site em Next.js
lib/                 leitura dos JSON, formatação, cards (next/og)
data/                saídas do pipeline (JSON) e dados curados à mão (data/manual)
docs/                plano, roadmap e calibração
tests/               pytest
```

Feito por Lucas Santana.

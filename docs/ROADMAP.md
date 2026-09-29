# Roadmap — Fortaleza em Números

> Criado em 29/09/2026 a partir da análise externa do projeto (ChatGPT) revisada com o Lucas.
> Direção: o site já responde "como o Fortaleza está?"; a próxima fase é a **participação da torcida**
> ("E você, tricolor?"), sem perder a simplicidade da arquitetura (JSON gerado pelo cron + site estático + API do
> simulador). Tudo que depender de resultados precisa se atualizar sozinho pelo pipeline.

## Regras para qualquer feature nova

1. É divertido? Dá vontade de compartilhar? O torcedor pode fazer alguma coisa?
2. Funciona sem cadastro (URL, localStorage ou JSON do pipeline)? Banco só no pacote 4.
3. Atualiza sozinha pelo pipeline, sem trabalho manual a cada rodada (nada de perguntas ou marcos escritos à mão;
   marco manual só entra pesquisado e confirmado pelo Lucas).
4. Linguagem de torcedor, pt-BR, mobile first; nada que pareça aposta com dinheiro.
5. Commits pequenos, em pt-BR, só com aprovação do Lucas (ver `CLAUDE.md`).

## Pacote 1 — Chance e contexto (sem banco) · ~1 dia

> **Status (29/09/2026): implementado** (itens 1–10). Backtest com cache por rodada (`data/backtest.json`, 10 mil
> simulações por rodada; só a rodada nova é calculada), calibração em `docs/CALIBRACAO.md` (gerado pelo pipeline),
> jogos-chave e "Pra secar" das mesmas 20 mil simulações do topo, card `/api/card/conta`, quiz da rodada 1,
> "Até a rodada 38" com a pontuação mais provável e as marcas explicadas, "Situação atual · N jogos", aviso de
> dados atrasados (`meta.dataStatus`), simulador antes de "Até a rodada 38" e README. A calibração da temporada
> (G2/G6) entra sozinha quando os pontos corridos acabarem.

1. **Backtest rodada a rodada** (pipeline): recalcular a chance de acesso/direto/G6 do Fortaleza em cada rodada
   passada usando só os jogos disputados até ali (`data/matches.json`), com o mesmo modelo e semente fixa. Hoje o
   `data/history.json` só tem a rodada 29.
   - Gera o gráfico **"Como a chance mudou"** (a montanha-russa da chance).
   - **Calibração**: comparar as chances previstas com o que aconteceu (ex.: Brier score e calibração por faixa para
     todos os times e rodadas) e publicar o resumo (README e/ou `docs/`). Não mostrar termos técnicos na página.
   - Cuidar do tempo do Actions (29 rodadas × simulação): usar menos simulações no backtest se precisar e só
     recalcular a rodada nova nas execuções normais.
2. **Card "A conta mudou"**: chance antes x agora (ex.: 62% → 68%) gerado automaticamente depois de cada rodada
   (nova rota de card no mesmo padrão de `lib/og/cards.tsx`).
3. **"O jogo que mais mexe na chance"** (pipeline): para cada jogo restante do Fortaleza, simular V, E e D fixados
   e comparar com a chance atual; mostrar os jogos ordenados pelo impacto.
4. **"Pra secar nesta rodada"**: o mesmo cálculo para os jogos dos rivais da corrida (qual resultado de cada jogo
   de rival mais ajuda o Fortaleza e quanto).
5. **"Você lembra onde o Leão estava na rodada 1?"**: pergunta interativa (toque para revelar) que abre a
   montanha-russa; dados já existem em `data/timeline.json`.
6. **"Até a rodada 38" mais humano**: ponto do meio em destaque e as marcas de 63/69 pontos explicadas em frase.
7. **Correção "depois da rodada 29" com 30 jogos**: mostrar algo como "Situação atual · 30 jogos" (a rodada
   completa pode continuar no rodapé/metodologia).
8. **Aviso de dados atrasados**: `meta.json` com status da fonte (usar `data/raw/state.json`); se a ESPN estiver
   falhando, a página diz "Dados atualizados até {data}".
9. **Ordem das seções**: simulador antes de "Até a rodada 38".
10. **README de portfólio** (o repositório não tem README): o que é, links, arquitetura, como o modelo funciona
    (descrever como "Poisson com incerteza nas forças dos times", não "bayesiano completo"), validação/calibração,
    decisões técnicas, limitações, prints. Perguntar ao Lucas antes de publicar (regra global dele sobre README).

## Pacote 2 — Desafio e conteúdo (sem banco) · ~meio dia

> **Status (29/09/2026): implementado** (itens 1–7). Desafio pelo link (`?a=&ap=31VVED...`, previsão guardada por
> rodada, então o placar de acertos continua valendo depois dos jogos; `lib/challenge.ts`), duelo lado a lado no
> simulador e card `/api/card/duelo`, card `/api/card/provocacao` (modelo x eu), persona da previsão
> (`predictionPersona`), confrontos diretos opcionais no simulador (API `x=id:1|X|2`), cards de curiosidade do
> Raio-X (`/api/card/curiosidade?t=`) e a seção "Conteúdo da rodada" (acesso, conta mudou, próximo jogo com escudos
> e chances, curiosidade que roda a cada rodada).

1. **Desafio do Leão**: previsão completa + apelido no link; o amigo abre, faz a dele e vê a comparação lado a lado.
2. **Card duelo** ("Lucas x João: quem conhece mais o Leão?").
3. **Card de provocação**: "Modelo: 62% · Meu palpite: 81%".
4. **"Minha previsão" com mais personalidade** (textos do card conforme o cenário).
5. **"E se" dos confrontos diretos** (opcional no simulador): escolher também os jogos entre os rivais da corrida.
6. **Cards de curiosidade** do Raio-X como imagens compartilháveis ("11 gols nos últimos 15 minutos").
7. **"Conteúdo da rodada"**: área com 3–4 cards prontos para postar depois de cada jogo (sem postar sozinho).

## Pacote 3 — Jogo contínuo (sem banco, localStorage) · ~1 dia

1. **Palpite da rodada** com **placar exato** (resultado +2, placar exato +5), conferido pelo pipeline.
2. **Conquistas** locais ("Olho de lince", "Professor Pardal", "Fé inabalável", "Secador profissional").
3. **Bingo da campanha** marcado sozinho com eventos que o pipeline já calcula.
4. **Quiz relâmpago** com perguntas geradas pelos dados (nunca escritas à mão).
5. **Cartão "Meu Leão"**: 4 respostas viram um story; "minha frase" só com opções prontas (sem texto livre).

## Pacote 4 — Social (com banco) · 2+ dias, só se o pacote 3 pegar

1. **Liga dos amigos** (grupo com código, ranking entre amigos).
2. **Modo corneta / termômetro da torcida** (um voto por pessoa por jogo, proteção contra robôs).
- Banco: comparar Supabase (plano grátis pausa após 1 semana sem uso) com opções do Marketplace da Vercel; RLS
  obrigatório, nenhuma chave privilegiada no front.

## Fora de escopo (decidido)

Chat com IA, login obrigatório, comentários abertos, ranking global, notícias próprias, modo matchday em tempo real
(iria contra a regra de gentileza com a ESPN), estatística demais (xG, escalações, lesões).

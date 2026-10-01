# Fortaleza em Números — Plano completo do projeto

> Painel de desempenho do Fortaleza Esporte Clube na Série B 2026, feito **para o torcedor comum**.
> Documento escrito em 28/09/2026 para ser entregue ao **Claude Code**, que vai construir, configurar e publicar o projeto praticamente sozinho.
> Dono do projeto: **Lucas** (desenvolvedor, torcedor do Leão). Nome provisório era "Painel do Leão"; **nome definido em 28/09/2026: "Fortaleza em Números"** (site: fortaleza-em-numeros.vercel.app).
> Stack: **Python** para dados, requisições e simulações + **Next.js** para o site.

---

## Sumário

0. [Instruções para o Claude Code (leia primeiro)](#0-instruções-para-o-claude-code-leia-primeiro)
1. [Visão geral e objetivo](#1-visão-geral-e-objetivo)
2. [Contexto do campeonato](#2-contexto-do-campeonato)
3. [Arquitetura](#3-arquitetura)
4. [Stack](#4-stack)
5. [Fonte de dados (API)](#5-fonte-de-dados-api)
6. [Modelo de dados normalizado e arquivos JSON](#6-modelo-de-dados-normalizado-e-arquivos-json)
7. [Cálculos da temporada](#7-cálculos-da-temporada)
8. [Modelo de probabilidade (considerando os rivais)](#8-modelo-de-probabilidade-considerando-os-rivais)
9. [Features — especificação completa](#9-features--especificação-completa)
10. [Design system e direção visual](#10-design-system-e-direção-visual)
11. [Textos e tom de voz](#11-textos-e-tom-de-voz)
12. [Estrutura de pastas](#12-estrutura-de-pastas)
13. [Automação: atualização sozinha a cada 2 horas](#13-automação-atualização-sozinha-a-cada-2-horas)
14. [Deploy, domínio, SEO e analytics](#14-deploy-domínio-seo-e-analytics)
15. [Testes e verificações](#15-testes-e-verificações)
16. [O que o Lucas faz manualmente (lista completa)](#16-o-que-o-lucas-faz-manualmente-lista-completa)
17. [Roteiro de execução em 3 dias](#17-roteiro-de-execução-em-3-dias)
18. [Lançamento e divulgação](#18-lançamento-e-divulgação)
19. [Riscos e planos B](#19-riscos-e-planos-b)
20. [Backlog pós-lançamento](#20-backlog-pós-lançamento)
21. [Prompt inicial para colar no Claude Code](#21-prompt-inicial-para-colar-no-claude-code)

---

## 0. Instruções para o Claude Code (leia primeiro)

Você é o **executor principal** deste projeto. O Lucas quer entregar algo **rápido e divertido** para a torcida do Fortaleza, em **até 3 dias**. A parte de dados (requisições à API, cálculos e simulações) é em **Python**, por escolha dele; o site é em **Next.js**. Ele não quer um tutorial passo a passo: quer o produto pronto, com você construindo e ele acompanhando.

### Regras de trabalho

1. **Autonomia máxima.** Tudo que puder ser feito por você (criar arquivos, instalar dependências, rodar comandos, configurar Git, GitHub, Vercel, GitHub Actions, secrets, variáveis de ambiente, testes, pesquisa na web, redação de textos) **deve ser feito por você**. Não peça ao Lucas para fazer algo que você consegue fazer.
2. **Peça ao Lucas apenas o que é impossível automatizar**, listado na [seção 16](#16-o-que-o-lucas-faz-manualmente-lista-completa): criar a chave da API, fazer login em contas pelo navegador, aprovar permissões, escolher o visual, e postar nas redes.
3. **Quando precisar de algo do Lucas**, peça de forma curta, com o passo a passo exato (qual link abrir, onde clicar, o que colar no terminal) e depois continue sozinho.
4. **Checkpoints visuais.** O Lucas quer escolher a parte visual. Nos pontos marcados como `CHECKPOINT VISUAL`, gere opções reais que ele possa ver (rota `/preview` no site ou deploy de preview na Vercel) e espere a escolha dele antes de seguir com aquela parte. Nunca pare o projeto inteiro esperando: enquanto ele decide, avance nas partes que não dependem da escolha.
5. **Idioma:** toda a interface em português do Brasil. Código, nomes de variáveis e commits podem ser em inglês ou português, mas mantenha consistência (sugestão: código em inglês, textos da UI em pt-BR, commits em pt-BR).
6. **Commits pequenos e frequentes**, com mensagens claras. Faça push com frequência para que a Vercel gere previews.
7. **Crie um `CLAUDE.md` na raiz do repositório** resumindo este plano (stack, comandos, estrutura, regras) para que sessões futuras tenham contexto. Salve este arquivo inteiro em `docs/PLANO.md`.
8. **Segredos nunca vão para o Git.** A chave da API fica em `.env.local` (local), em GitHub Secrets (Actions) e, se necessário, em variáveis de ambiente da Vercel. Garanta que `.env*` está no `.gitignore` antes do primeiro commit.
9. **Verifique fatos antes de exibir.** Dados do campeonato vêm da API. Qualquer informação escrita à mão (marcos da temporada, nomes de técnicos, regras do regulamento) deve ser pesquisada na web e confirmada com o Lucas antes de ir ao ar.
10. **Priorize o que vai ao ar.** Se o tempo apertar, siga a ordem de cortes da [seção 17](#ordem-de-cortes-se-atrasar). O que não pode sair de jeito nenhum: modelo com os rivais, topo, montanha-russa e simulador.
11. **Ao final de cada fase**, mostre ao Lucas um resumo curto: o que ficou pronto, link do preview, e o que você precisa dele (se precisar).

### Configuração de permissões sugerida

Para reduzir as confirmações que o Lucas precisa aprovar, crie `.claude/settings.json` no projeto com uma lista de comandos liberados. Sugestão:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      "Bash(uv:*)",
      "Bash(python:*)",
      "Bash(python3:*)",
      "Bash(curl:*)",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(vercel:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)",
      "WebFetch",
      "WebSearch"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf /:*)"
    ]
  }
}
```

Explique ao Lucas, em uma frase, que isso evita ter que aprovar cada comando manualmente e peça a aprovação dele para criar o arquivo.

---

## 1. Visão geral e objetivo

### O que é

Um site de uma página, bonito e interativo, que mostra **como o Fortaleza está na Série B 2026**, **quais as chances reais de acesso** (considerando os rivais) e permite que o torcedor **simule os jogos que faltam**. Atualiza sozinho poucas horas depois de cada jogo.

### Para quem

Torcedor comum do Fortaleza. Não é para desenvolvedores, não é para analistas. A pessoa abre o link no celular (vindo do WhatsApp ou Twitter/X), entende tudo em segundos, brinca no simulador e compartilha.

### Princípios

1. **Torcedor primeiro.** Nenhum termo técnico na interface. Nada de "Poisson", "Monte Carlo", "xG", "aproveitamento de passes". Use "chance de subir", "no Castelão", "fora de casa", "sequência sem perder".
2. **Menos números, mais história.** Cada seção tem uma frase de destaque que diz o que o dado significa. O número apoia a frase.
3. **Mobile-first.** 90% do acesso vai ser pelo celular. Tudo é pensado primeiro para uma tela de ~390px.
4. **Zero manutenção.** Depois de publicado, o site se atualiza sozinho. O Lucas não precisa mexer em nada durante o campeonato.
5. **Custo zero.** Vercel (plano Hobby), GitHub Actions e plano gratuito da API.
6. **Rápido de carregar.** Site estático, dados em JSON, sem backend próprio.

### Referência de partida

O projeto se inspira no painel do Náutico feito por Pablo Melo (`github.com/pablohmelo02/analise_nautico`). Do projeto dele, aproveitamos as **ideias** (casa x fora, gols por tempo, projeções), mas corrigimos três problemas:

| Problema no painel de referência | Como resolvemos aqui |
|---|---|
| Atualização manual (script rodado no PC + commit) | GitHub Actions roda sozinho a cada 2h e a Vercel publica |
| Linguagem "gerencial", voltada para relatório | Linguagem de torcedor, frases de destaque, visual de estádio |
| Probabilidades com cortes fixos de pontos, ignorando os outros clubes | Simulação do campeonato inteiro, time a time, com desempate e playoffs |

---

## 2. Contexto do campeonato

> **Atenção, Claude Code:** os dados abaixo são o retrato de quando o plano foi escrito. O site deve usar sempre os dados atuais da API. Use isto só como referência para validar se os números calculados fazem sentido.

### Situação em 28/09/2026 (aproximada)

- Fortaleza está na **Série B 2026**, rebaixado da Série A em 2025 (primeira vez na Série B desde 2018).
- Após a **29ª rodada**: Fortaleza em **2º lugar, 51 pontos**, empatado com o líder Vila Nova (Vila à frente por vitórias: 15 x 14). Novorizontino e Juventude com 50.
- **10 jogos de invencibilidade** no returno (5 vitórias e 5 empates).
- **1ª rodada:** Botafogo-SP 4 x 0 Fortaleza, fora de casa. O time terminou a rodada na **lanterna**.
- **Técnico:** fontes indicam que a temporada começou com **Thiago Carpini** e que o time hoje é comandado por **Paulo Autuori**. Pesquisar e confirmar datas da troca antes de usar como marco.
- Outras competições em 2026 (para o backlog, não para o MVP): campeão cearense, finalista da Copa do Nordeste, eliminado nas oitavas da Copa do Brasil.

### Formato da Série B 2026

- 20 clubes, pontos corridos, turno e returno, **38 rodadas**.
- **1º e 2º colocados:** acesso direto à Série A.
- **3º ao 6º:** disputam **playoffs** de acesso, em jogos de ida e volta, com cruzamentos **3º x 6º** e **4º x 5º**. Os vencedores dos dois confrontos também sobem (total de 4 acessos).
- **17º ao 20º:** rebaixados para a Série C (Z4).

**Critérios de desempate na classificação** (em ordem): pontos, vitórias, saldo de gols, gols marcados, confronto direto (só entre 2 clubes), menos cartões vermelhos, menos cartões amarelos, sorteio.

**A confirmar pelo Claude Code** (pesquisar o Regulamento Específico da Competição da CBF 2026):
- No playoff, quem decide em casa (provavelmente a melhor campanha faz o segundo jogo em casa).
- Critério em caso de empate no placar agregado do playoff (vantagem da melhor campanha ou pênaltis).
- Datas dos playoffs.

Se não encontrar, use como padrão: **melhor campanha joga a volta em casa**, e **empate no agregado vai para pênaltis (50%/50%)**. Registre a suposição no código e no rodapé de metodologia.

---

## 3. Arquitetura

### Visão geral

Sem servidor próprio para manter. **Python cuida de tudo que é dado** (requisições, cálculos, simulações) e **Next.js cuida só da interface**. Tudo roda em serviços gratuitos:

```
┌───────────────────────┐
│  API de futebol       │  (footballsoccerapi.com ou API-Football)
└──────────┬────────────┘
           │  requisições (poucas por dia)
           ▼
┌──────────────────────────────────────────────────────────┐
│  GitHub Actions (cron a cada 2 horas) — PYTHON           │
│  pipeline/update_data.py                                  │
│   1. busca jogos da Série B, todos os times   [httpx]     │
│   2. busca detalhes só dos jogos novos do Fortaleza       │
│   3. calcula tabela, linha do tempo, corrida, raio-x      │
│                                               [pandas]    │
│   4. roda 20.000 simulações do campeonato     [numpy]     │
│   5. valida e grava /data/*.json              [pydantic]  │
│   6. se algo mudou → commit + push                        │
└──────────┬───────────────────────────────────────────────┘
           │  push no GitHub
           ▼
┌──────────────────────────────────────────────────────────┐
│  Vercel (deploy automático a cada push) — um projeto só   │
│                                                           │
│  Next.js (TypeScript)              FastAPI (Python)       │
│  • página lendo /data/*.json       • /api/py/simular      │
│    no build                          simulador "E se?"    │
│  • /api/card/* imagens para          com o MESMO modelo   │
│    compartilhar (next/og)            do pipeline          │
│                                    • /api/py/health       │
└──────────────────────────────────────────────────────────┘
```

### Por que essa arquitetura é a mais rápida

- **Python onde ele brilha:** numpy simula milhares de temporadas de forma vetorizada em frações de segundo, pandas deixa os cálculos curtos e legíveis, pydantic valida a resposta da API.
- **Um único modelo de probabilidade, em Python.** O pipeline (GitHub Actions) e o simulador (FastAPI) importam o mesmo pacote `pipeline/model`. O número do topo e o do simulador nunca divergem por serem implementações diferentes.
- **Sem VPS, sem Nginx, sem HTTPS para configurar.** A Vercel roda o Next.js e funções Python (FastAPI) no mesmo projeto, com HTTPS e CDN. Referência: o template oficial "Next.js FastAPI Starter" da Vercel. O Claude Code deve conferir a documentação atual do runtime Python da Vercel antes de configurar.
- **Os dados viram arquivos JSON versionados no Git.** Dá para ver o histórico de cada atualização e voltar atrás se algo quebrar.
- **A chave da API nunca chega ao navegador nem à Vercel.** Ela só existe no GitHub Actions. A FastAPI não chama a API de futebol: só lê `data/model.json`.
- **Tipos sincronizados automaticamente:** os modelos pydantic geram JSON Schema, que vira tipos TypeScript para o front (`pnpm gen:types`). Mudou um campo no Python, o front acusa o erro.

### Fluxo de atualização

1. Jogo do Fortaleza (ou de qualquer rival) termina.
2. Em até 2 horas, o cron do GitHub Actions roda, detecta o jogo novo e recalcula tudo.
3. Commit automático `dados: atualização automática (rodada N)`.
4. A Vercel faz o deploy em ~1 minuto.
5. O site mostra "Atualizado há X minutos".

Se o script falhar, o GitHub envia e-mail automaticamente para o dono do repositório (comportamento padrão do Actions). O site continua no ar com os últimos dados válidos.

---

## 4. Stack

Use sempre a **versão estável mais recente** de cada pacote no momento da instalação.

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem de dados | **Python 3.12+** | Escolha do Lucas; ecossistema forte para dados |
| Gerenciador Python | **uv** | Instala e roda muito rápido, com lockfile; ótimo no GitHub Actions |
| Requisições | **httpx** + **tenacity** | Cliente HTTP moderno + retry com backoff |
| Variáveis locais | **python-dotenv** | Lê a chave do `.env.local` em desenvolvimento |
| Tabelas e cálculos | **pandas** | Tabela, linha do tempo, raio-x (só no pipeline) |
| Simulação | **numpy** | Monte Carlo vetorizado |
| Validação | **pydantic v2** | Valida a API e define o formato dos JSON; se a API mudar, o script falha em vez de publicar lixo |
| API do simulador | **FastAPI** (função Python na Vercel) | Serve o simulador "E se?" com o mesmo modelo do pipeline |
| Datas | **zoneinfo** (Python) / **date-fns-tz** (front) | Fuso `America/Fortaleza` (UTC-3) |
| Testes | **pytest** | Tabela, desempate, modelo e API |
| Framework do site | **Next.js (App Router) + TypeScript** | O Lucas já domina; SSG + rotas de imagem |
| Gerenciador Node | **pnpm** | Rápido |
| Estilo | **Tailwind CSS** | Rápido de iterar no visual |
| Gráficos | **Recharts** | Simples, suporta eixo invertido, áreas de referência e anotações |
| Animações | **Motion** (`motion/react`, antigo Framer Motion) | Números contando, linha se desenhando, transições do simulador |
| Ícones | **lucide-react** | Leve e consistente |
| Imagens de compartilhamento | **`next/og` (ImageResponse)** | Gera PNG de story no servidor a partir de JSX |
| Tipos do front | **json-schema-to-typescript** | Gera tipos TS a partir dos modelos pydantic |
| Analytics | **@vercel/analytics** | Ver quantas pessoas acessam, grátis |
| Hospedagem | **Vercel (Hobby)** | Grátis, deploy por push, Next.js + Python |
| Automação | **GitHub Actions** | Cron grátis |
| CLI | **gh** (GitHub CLI) e **vercel** (Vercel CLI) | Para o Claude Code configurar tudo pelo terminal |

**Regra importante de dependências:** o pacote `pipeline/model` (usado pela FastAPI) importa **só numpy e pydantic**, nunca pandas. Assim a função Python da Vercel fica leve (fastapi + numpy + pydantic) e pandas/httpx ficam só no pipeline. Usar grupos de dependência no `pyproject.toml` (`api` e `pipeline`).

---

## 5. Fonte de dados (API)

> **Decisão tomada em 28/09/2026 (substitui o que estiver em conflito abaixo)**
>
> - **Provedor principal: API pública da ESPN** (`site.api.espn.com/.../soccer/bra.2`), sem chave. O endpoint
>   `/scoreboard?dates=YYYYMMDD` traz, por dia, placar, gols com minuto (inclusive acréscimos), cartões por
>   jogador e estatísticas por time, além do calendário completo da temporada (`leagues[0].calendar`).
>   As datas seguem o fuso de Nova York. É não oficial: sem SLA e pode mudar sem aviso.
> - **Provedor reserva: footballsoccerapi.com** (plano grátis: 50 chamadas/dia; `/matches` e `/matches/{id}`
>   liberados; `/matches/{id}/events` só no plano pago). Implementado para o essencial: placares, intervalo,
>   horários (1 chamada por execução).
>   **Sondagem real (28/09):** no plano grátis a listagem só alcança *ontem, hoje e os próximos jogos*;
>   horário vem como timestamp Unix; sem estatísticas nem eventos (403). Serve como reserva porque o
>   histórico já está no cache e o cron de 2h cobre qualquer jogo novo dentro dessa janela.
> - **Fallback automático:** se a ESPN falhar (rede, HTTP ou validação pydantic), o pipeline usa o reserva
>   para os placares, mantém os detalhes já em cache e desliga só o que faltar (`hasGoalMinutes`).
>   Se os dois falharem, sai com erro sem publicar nada (o site fica com os últimos dados válidos).
> - **Aviso:** o contador de falhas seguidas da ESPN fica em `data/raw/state.json`. Com 2 falhas seguidas,
>   o workflow abre uma issue (label `fonte-de-dados`) via `gh`; ela é fechada sozinha quando a ESPN volta.
> - **Gentileza com a ESPN:** cron continua a cada 2h, mas **só consulta quando algum jogo já deveria ter
>   terminado** (início + 2h15) e ainda não consta como encerrado, decidido pelos horários em cache, sem
>   chamada. Consulta só as datas desses jogos (+ próximos 3 dias, para horários remarcados, e datas novas do
>   calendário). Pausa de 1,5s entre chamadas, retry com backoff (3 tentativas). Jogo "travado" há mais de
>   48h é reconsultado no máximo 1x por dia. Carga inicial: ~133 chamadas, uma única vez.
> - **Rodadas:** `data/manual/rounds.json` mapeia `"{mandante}--{visitante}" -> rodada` (cada confronto
>   ocorre uma vez em turno e returno), gerado por `pipeline/build_reference.py` a partir da tabela oficial
>   publicada pelo ge.globo (a API da CBF exige token). Também gera `data/manual/teams.json` com slug
>   canônico, sigla oficial, cores (curadoria, a confirmar) e o id de cada clube em cada provedor.
> - **IDs canônicos:** times por slug (`fortaleza`), jogos por `"{mandante}--{visitante}"`. Assim os dois
>   provedores se mesclam sem depender dos ids de cada um.
> - **Qualidade da ESPN:** alguns gols vêm duplicados; o provedor remove duplicatas (mesmo autor, ≤ 2 min)
>   só quando a soma passa do placar, e corrige gol contra atribuído ao time errado. Cartões diferem da
>   CBF em 1–3 por time na temporada (afeta só o 6º/7º critério de desempate).
> - **Regulamento (confirmado no ge.globo):** G2 sobe direto; 3º x 6º e 4º x 5º nos playoffs; Z4 cai;
>   desempate: vitórias, saldo, gols pró, confronto direto, menos vermelhos, menos amarelos, sorteio.
> - **Playoffs (confirmado na imprensa, 28/09):** melhor campanha faz a volta em casa; empate no placar agregado
>   classifica a melhor campanha (não há pênaltis). Implementado em `pipeline/model/playoffs.py`; substitui a
>   suposição "pênaltis 50/50" das seções 2 e 8.3.
> - **Sem pandas:** os cálculos da seção 7 ficaram em Python puro (mais simples e sem dependência pesada no Actions).

### Estratégia

Criar uma **camada de provedor** (`pipeline/providers/`) com uma interface única. O resto do código nunca fala direto com a API: só com os tipos normalizados da [seção 6](#6-modelo-de-dados-normalizado-e-arquivos-json). Assim, trocar de API é trocar um arquivo.

```python
# pipeline/providers/base.py
from typing import Protocol
from pipeline.models import Match, MatchDetails

class DataProvider(Protocol):
    name: str
    def fetch_season_matches(self) -> list[Match]: ...                    # todos os jogos da Série B 2026, todos os times
    def fetch_match_details(self, match_id: str) -> MatchDetails | None: ...  # estatísticas, gols com minuto
```

### Provedor 1 (preferencial): footballsoccerapi.com

Foi o usado no painel do Náutico, então já sabemos que cobre a Série B 2026.

- Base URL: `https://api.footballsoccerapi.com/v1`
- Autenticação: header `X-API-Key: <chave>`
- ID da Série B (usado no projeto de referência): `lg_1VQKEDM`
- Listagem de jogos: `GET /matches?league_id=lg_1VQKEDM&season=2026&limit=1000&sort=kickoff_utc` com paginação por `meta.next_cursor`.
  - **Não filtrar por `team_id`**: precisamos dos jogos de **todos os times** para o modelo e para a tabela.
- Detalhes: `GET /matches/{match_id}` → campos vistos no projeto de referência: `home_team_id`, `away_team_id`, `home_team_name`, `away_team_name`, `home_goals`, `away_goals`, `half_time_home_goals`, `half_time_away_goals`, `match_status` (`finished`), `kickoff_date`, `venue_name`, `city_name`, `statistics[]` (por time: `possession_pct`, `shots_total`, `shots_on_target`, `corners`, `yellow_cards`, `red_cards` etc.).
- **Descobrir:** ID do Fortaleza, se existe número da rodada, se existem eventos de gol com minuto, limites do plano gratuito.

### Provedor 2 (plano B): API-Football (api-sports.io)

- Base URL: `https://v3.football.api-sports.io`
- Header: `x-apisports-key: <chave>`
- Série B do Brasil: provavelmente `league=72` (Série A é 71). Confirmar com `GET /leagues?country=Brazil&season=2026`.
- Jogos: `GET /fixtures?league=72&season=2026` (traz rodada no campo `league.round`, ex.: `"Regular Season - 29"`, e placar do intervalo em `score.halftime`).
- Eventos (gols com minuto): `GET /fixtures/events?fixture={id}`.
- Plano grátis: 100 requisições/dia. **Verificar se o plano gratuito libera a temporada 2026** (em algumas épocas o plano grátis só dá acesso a temporadas antigas).

### Script de sondagem (primeira coisa a rodar)

Criar `pipeline/probe_api.py` (rodado com `uv run python -m pipeline.probe_api`), que:

1. Lê a chave de `.env.local` (`FOOTBALL_API_KEY` e `FOOTBALL_API_PROVIDER`).
2. Busca todos os jogos da Série B 2026.
3. Busca os detalhes de **um** jogo do Fortaleza já encerrado.
4. Gera `docs/api-report.md` respondendo:
   - Quantos jogos vieram? (esperado: 380 no total, ~290 encerrados)
   - Vêm jogos de todos os 20 times?
   - Tem campo de rodada? Qual?
   - Tem placar do intervalo?
   - Tem gols com minuto? Onde?
   - Tem estatísticas por time?
   - Tem cartões vermelhos/amarelos por time (para desempate)?
   - Quantas requisições foram usadas e quanto sobra no plano?
   - ID do Fortaleza e IDs de todos os times, com nomes.
5. Salva uma amostra crua de cada endpoint em `docs/api-samples/` (arquivos ignorados pelo Git se tiverem dados sensíveis; o conteúdo de jogos em si não é sensível).

**Decisão automática após a sondagem:**
- Se o provedor 1 tiver jogos de todos os times + rodada (ou forma de deduzir) → segue com ele.
- Se não tiver jogos de todos os times → tentar provedor 2 (pedir ao Lucas a segunda chave).
- Se nenhum trouxer minuto dos gols → a seção "gols por faixa de minutos" fica desligada (feature flag `hasGoalMinutes: false` no JSON), sem bloquear o resto.

### Economia de requisições

- A cada execução: **1 chamada** de listagem (ou poucas, se paginar).
- Detalhes: **somente** de jogos do Fortaleza com status `finished` que ainda não estão em `data/raw/details/`.
- Carga inicial: ~29 chamadas de detalhes (uma vez só). Depois, ~1 por jogo do Fortaleza.
- Resultado: bem abaixo de 100 requisições/dia mesmo rodando a cada 2h (12 execuções × 1 listagem = 12/dia).
- Implementar **retry com backoff** (3 tentativas) e **pausa de 250ms** entre chamadas de detalhes.

### Rodada dos jogos

Se o provedor não informar a rodada:
1. Tentar deduzir: para cada time, ordenar os jogos pela data **agendada original**; se a API tiver campo de data original, usar.
2. Se não der, criar `data/manual/rounds.json` mapeando `matchId → rodada`, gerado pelo Claude Code a partir da tabela oficial da CBF (`cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-b/2026`) ou de outra fonte pública. Mostrar ao Lucas só se houver dúvida.

---

## 6. Modelo de dados normalizado e arquivos JSON

### Tipos principais (pydantic)

```python
# pipeline/models.py
from typing import Literal
from pydantic import BaseModel

TeamId = str
MatchStatus = Literal["scheduled", "live", "finished", "postponed", "cancelled"]

class Team(BaseModel):
    id: TeamId
    name: str          # "Fortaleza"
    short_name: str    # "FOR" (sigla de 3 letras, gerada ou manual)
    color: str         # cor principal do clube, para os badges (data/manual/teams.json)

class Match(BaseModel):
    id: str
    round: int                     # 1..38
    kickoff_utc: str               # ISO 8601
    status: MatchStatus
    home_id: TeamId
    away_id: TeamId
    home_goals: int | None = None
    away_goals: int | None = None
    ht_home_goals: int | None = None
    ht_away_goals: int | None = None
    venue: str | None = None
    city: str | None = None

class GoalEvent(BaseModel):
    match_id: str
    team_id: TeamId
    minute: int                    # 1..90 (45+2 → 45, 90+3 → 90)
    extra: int | None = None       # minutos de acréscimo, se existirem
    period: Literal[1, 2]

class TeamStats(BaseModel):
    possession: float | None = None
    shots: int | None = None
    shots_on_target: int | None = None
    corners: int | None = None
    yellow: int | None = None
    red: int | None = None

class MatchDetails(BaseModel):
    match_id: str
    goals: list[GoalEvent] = []    # pode vir vazio se a API não tiver
    stats: dict[TeamId, TeamStats] | None = None
```

Os arquivos de saída (`meta.json`, `standings.json` etc.) também têm um modelo pydantic cada. O comando `pnpm gen:types` exporta o JSON Schema desses modelos e gera `lib/generated/*.ts` com os tipos TypeScript usados pelo site. Nos JSON, usar **camelCase** nas chaves (configurar `alias_generator` do pydantic) para ficar natural no front.

### Arquivos gerados em `/data`

Todos gerados pelo `pipeline/update_data.py`. O site só lê estes arquivos (e a FastAPI lê o `model.json`).

| Arquivo | Conteúdo | Usado por |
|---|---|---|
| `meta.json` | `updatedAt`, `season`, `lastCompletedRound`, `fortalezaId`, `provider`, flags (`hasGoalMinutes`, `hasHalfTime`), `seasonState` (`regular`, `playoffs`, `finished`) | tudo |
| `teams.json` | lista de `Team` | tudo |
| `matches.json` | todos os `Match` da temporada | simulador, corrida |
| `standings.json` | tabela atual completa com todos os critérios | topo, corrida, simulador |
| `timeline.json` | posição e pontos do Fortaleza (e dos rivais) ao fim de cada rodada + marcos | montanha-russa |
| `race.json` | dados da corrida pelo acesso | corrida |
| `xray.json` | raio-x do Fortaleza + frases de destaque | raio-x |
| `simulation.json` | probabilidades de todos os times (G2, G6, playoffs, acesso total, Z4, distribuição de posição, pontos esperados) + "números mágicos" | topo, corrida, card |
| `model.json` | forças dos times + jogos restantes + tabela atual, no formato exato que a API do simulador precisa | FastAPI do simulador |
| `next-match.json` | próximo jogo do Fortaleza (adversário, data, local, retrospecto no 1º turno, forma recente dos dois) | topo |
| `history.json` | chance de acesso do Fortaleza após cada rodada (histórico acumulado a cada execução) | extra opcional |

Arquivos manuais em `/data/manual`:

| Arquivo | Conteúdo | Quem preenche |
|---|---|---|
| `teams.json` | sigla e cor de cada clube | Claude Code (pesquisa), Lucas só confirma |
| `milestones.json` | marcos escritos à mão (ex.: troca de técnico) | Claude Code pesquisa e redige, Lucas confirma |
| `rounds.json` | mapa jogo → rodada (só se a API não trouxer) | Claude Code |

Arquivos crus em `/data/raw` (cache da API, versionados para não repetir requisição):
- `raw/state.json` (estado entre execuções: calendário da ESPN, última consulta por data, contador de falhas)
- O cache de jogos e detalhes são os próprios `data/matches.json` e `data/details.json` (detalhes de **todos** os jogos, vindos da ESPN). Respostas cruas ficam só em `.cache/` local (fora do Git).

---

## 7. Cálculos da temporada

Todos em `pipeline/calc/`, funções puras (recebem dados, devolvem dados), testadas com pytest. Pode usar pandas à vontade aqui.

### 7.1 Tabela (`standings.py`)

Para cada time: jogos, vitórias, empates, derrotas, gols pró, gols contra, saldo, pontos, aproveitamento, cartões vermelhos e amarelos (se disponíveis), campanha em casa e fora.

Ordenação: pontos → vitórias → saldo → gols pró → confronto direto (só se exatamente 2 times empatados em tudo acima) → menos vermelhos → menos amarelos → ordem alfabética (substituto do sorteio, para ser determinístico).

**Testar** com a tabela real da rodada 29 (Vila Nova 1º e Fortaleza 2º com 51 pontos, Vila à frente por vitórias).

### 7.2 Linha do tempo (`timeline.py`)

Para cada rodada `r` de 1 até a última concluída:
- Considerar os jogos encerrados das rodadas `≤ r`.
- Jogos adiados entram na rodada em que foram **disputados de fato** para fins de classificação daquele momento. Regra prática: a classificação "ao fim da rodada r" inclui todos os jogos encerrados com data **até o último jogo disputado da rodada r** (ignorando, nesse cálculo da data de corte, jogos da rodada r que foram adiados para mais de 5 dias depois da data mediana da rodada).
- Guardar, para cada time: posição, pontos, resultado do jogo daquela rodada.

Saída para o Fortaleza: `[{ round, position, points, result: "V"|"E"|"D"|null, opponent, score, home }]`.

### 7.3 Marcos automáticos (`milestones.py`)

Detectar e gerar texto curto para:
- Pior posição da temporada (ex.: "Lanterna após a estreia").
- Primeira entrada no G6.
- Primeira entrada no G2.
- Início da sequência invicta atual (se ≥ 5 jogos).
- Maior goleada a favor.
- Fim do 1º turno (rodada 19): "Fim do 1º turno: Xº com Y pontos".

Juntar com `data/manual/milestones.json` (ex.: troca de técnico). Evitar marcos demais: **máximo de 6 marcos visíveis**; se passar, priorizar manuais > G2 > lanterna > invencibilidade > G6 > resto.

### 7.4 Sequências (`streaks.py`)

Para o Fortaleza, considerando só a Série B:
- Sequência atual (ex.: "10 jogos sem perder", "3 vitórias seguidas", ou "2 jogos sem vencer").
- Maior sequência invicta da temporada.
- Maior sequência de vitórias.
- Jogos sem sofrer gol (total) e maior sequência sem sofrer gol.
- Forma dos últimos 5 jogos (V/E/D, do mais antigo para o mais recente).

### 7.5 Raio-X (`xray.py`)

- **Casa x fora:** jogos, V/E/D, pontos, aproveitamento, gols pró/contra, em cada mando.
- **1º x 2º tempo:** gols pró e contra em cada tempo, saldo por tempo, percentual dos gols marcados no 2º tempo. Precisa de placar do intervalo.
- **Gols por faixa de minutos** (se `hasGoalMinutes`): faixas 1–15, 16–30, 31–45+, 46–60, 61–75, 76–90+. Gols pró e contra por faixa. Acréscimos contam na última faixa do tempo.
- **Turno x returno:** pontos e aproveitamento no 1º turno (rodadas 1–19) e no returno (20–38).
- **Frases de destaque** geradas por regras (ver 7.6).

### 7.6 Gerador de frases (`insights.py`)

Frases escritas por templates com condições, **sem IA**, para serem confiáveis. Cada regra tem prioridade; cada bloco do raio-x mostra a frase de maior prioridade que se aplica. Exemplos:

| Condição | Frase |
|---|---|
| aproveitamento em casa − fora ≥ 15 pontos percentuais | "No Castelão o Leão é outro: {casa}% de aproveitamento em casa contra {fora}% fora." |
| aproveitamento fora ≥ casa | "Fora de casa o time rende tão bem quanto no Castelão: {fora}% longe de casa." |
| ≥ 60% dos gols pró no 2º tempo | "Time de segundo tempo: {pct}% dos gols saíram depois do intervalo." |
| ≥ 60% dos gols pró no 1º tempo | "O Leão resolve cedo: {pct}% dos gols vieram no 1º tempo." |
| faixa com mais gols pró é 76–90+ e tem ≥ 25% dos gols | "Reta final é com a gente: {n} gols nos últimos 15 minutos." |
| faixa com mais gols contra | "O ponto de atenção: {n} gols sofridos entre {faixa}." |
| returno − turno ≥ 0,4 ponto por jogo | "O returno é outro campeonato: {ppgR} pontos por jogo contra {ppgT} no 1º turno." |
| sequência invicta atual ≥ 5 | "{n} jogos sem perder. A última derrota foi {data} contra o {adversário}." |
| jogos sem sofrer gol ≥ 8 | "{n} jogos sem ser vazado na Série B." |

Números sempre arredondados para inteiros em percentuais e com uma casa em médias. Plural correto ("1 jogo", "2 jogos"). Testar os templates com dados reais.

### 7.7 Corrida pelo acesso (`race.py`)

**Quem aparece:** o Fortaleza + os times que estão no G6 **ou** a até 6 pontos da 6ª posição, limitado a **7 times no total**, ordenados pela tabela.

Para cada time:
- Posição, pontos, jogos, saldo.
- Forma dos últimos 5 (V/E/D).
- Jogos restantes: quantos em casa, quantos fora.
- **Jogos restantes contra times do G6 atual** (sem contar o próprio time).
- **Dificuldade da tabela restante:** média da força dos adversários restantes (vinda do modelo, seção 8), classificada em "Difícil", "Média" ou "Tranquila" pelos tercis entre os times da corrida.
- Chance de acesso direto, de G6 e de acesso total (vinda da simulação).
- Confrontos diretos restantes entre os times da corrida (ex.: "Fortaleza x Vila Nova — rodada 34").

Frase de destaque automática, exemplos:
- "O Vila Nova ainda enfrenta {n} times do G6. O Fortaleza, só {m}."
- "Tabela mais tranquila entre os candidatos: {time}."
- "{k} confrontos diretos até o fim: é aí que se decide."

---

## 8. Modelo de probabilidade (considerando os rivais)

Esta é a parte mais importante do projeto. O modelo simula **o campeonato inteiro**: todos os jogos restantes de todos os 20 times, milhares de vezes. Assim, a chance do Fortaleza leva em conta o que Vila Nova, Novorizontino, Juventude e todos os outros ainda vão enfrentar.

Código em `pipeline/model/` (só numpy + pydantic), **compartilhado** entre o pipeline no GitHub Actions (20.000 simulações) e a FastAPI do simulador na Vercel (5.000 simulações).

### 8.1 Força dos times (`ratings.py`)

Modelo de gols com distribuição de Poisson, separando mando de campo.

Com os jogos encerrados:
- `μH` = média de gols do mandante por jogo na liga.
- `μA` = média de gols do visitante por jogo na liga.

Para cada time `i`, quatro fatores, com **encolhimento para a média** (`k` jogos fictícios na média da liga, para não exagerar com amostras pequenas):

```
ataqueCasa_i  = (golsPróEmCasa_i  + k·μH) / ((jogosEmCasa_i + k) · μH)
defesaCasa_i  = (golsContraEmCasa_i + k·μA) / ((jogosEmCasa_i + k) · μA)
ataqueFora_i  = (golsPróFora_i    + k·μA) / ((jogosFora_i  + k) · μA)
defesaFora_i  = (golsContraFora_i + k·μH) / ((jogosFora_i  + k) · μH)
```

- `k = 4` como padrão (constante configurável `SHRINK_GAMES`).
- **Peso para jogos recentes:** cada jogo tem peso `w = 0.5 ^ (rodadasAtrás / MEIA_VIDA)`, com `MEIA_VIDA = 12` rodadas. Somas de gols e de jogos viram somas ponderadas. Isso faz a boa fase do returno pesar mais que a estreia ruim, sem ignorar a temporada.
- Defesa > 1 significa que o time **sofre mais** que a média.

Gols esperados de um jogo `mandante x visitante`:

```
λCasa = μH · ataqueCasa_mandante · defesaFora_visitante
λFora = μA · ataqueFora_visitante · defesaCasa_mandante
```

Limitar `λ` entre `0.2` e `4.0` por segurança.

**Força geral** (usada na "dificuldade da tabela"): `força_i = média(ataqueCasa, ataqueFora) / média(defesaCasa, defesaFora)`.

### 8.2 Simulação da temporada (`simulate.py`)

Lógica conceitual (a implementação real é vetorizada com numpy, ver as notas abaixo):

```
para s = 1 até N:
  tabela = cópia da tabela atual (pontos, vitórias, saldo, gols pró, cartões)
  para cada jogo restante (status != finished):
     se o jogo tiver resultado FIXADO (simulador "E se?"):
         sortear placar condizente com o resultado fixado (ver 8.4)
     senão:
         golsCasa ~ Poisson(λCasa), golsFora ~ Poisson(λFora)
     atualizar tabela
  ordenar tabela com os critérios de desempate
     (pontos → vitórias → saldo → gols pró → confronto direto, só entre 2 → menos vermelhos → menos amarelos → sorteio)
  registrar posição final de cada time
  simular playoffs (8.3) e registrar quem subiu
```

- `N = 20000` no pipeline; `N = 5000` na FastAPI do simulador.
- **Gerador aleatório com semente** (`numpy.random.default_rng(seed)`) para resultados reproduzíveis nos testes. No Actions, semente fixa por rodada (ex.: `seed = lastCompletedRound * 1000`) para o número não "pular" entre execuções sem jogo novo.
- **Vetorização:** para cada jogo restante, `rng.poisson(λ, size=N)` gera o placar das N temporadas de uma vez. A tabela vira matrizes N×20 (pontos, vitórias, saldo, gols pró) e a ordenação final usa `np.lexsort` (cartões de hoje como aproximação, porque a simulação não prevê cartões, e uma chave aleatória no fim no papel do sorteio); depois, onde exatamente 2 times empatam nos quatro primeiros critérios, o confronto direto (jogos disputados, guardados no `model.json`, + o jogo simulado entre eles) decide. Atualizado em 30/09/2026: antes a simulação ia de gols pró direto para o sorteio (efeito medido: no máximo 0,01 ponto nas chances).
- Jogos adiados sem data continuam como "restantes" e são simulados.
- Nada de loop Python por temporada: o loop é só sobre os jogos restantes (~80), cada passo vetorizado. Meta: **5.000 simulações em menos de 300ms** e 20.000 em poucos segundos.

### 8.3 Playoffs (`playoffs.py`)

Após cada temporada simulada:
- Confrontos: 3º x 6º e 4º x 5º, ida e volta.
- Jogo de ida na casa da pior campanha, volta na casa da melhor (confirmar regulamento, seção 2).
- Placar de cada jogo sorteado com o mesmo modelo de Poisson.
- Empate no agregado: aplicar a regra do regulamento. Padrão se não confirmada: pênaltis 50/50.
- Vencedores dos dois confrontos sobem.

### 8.4 Resultado fixado (simulador)

Quando o torcedor escolhe V, E ou D para um jogo do Fortaleza:
- Sortear placares de Poisson e reamostrar **só as simulações incompatíveis** com o resultado escolhido, até todas baterem (no máximo 30 rodadas de reamostragem).
- As que não baterem após 30 rodadas: placar tirado direto da distribuição de Poisson condicionada ao resultado escolhido (grade 0–15 gols). Até 30/09/2026 elas viravam placar padrão (1x0, 1x1, 0x1), o que acontecia em até 1/3 das simulações de resultados muito improváveis.

Isso mantém saldo e gols realistas para o desempate.

### 8.5 Saídas (`simulation.json`)

Para **cada time**:
- `pTitle` (1º lugar), `pDirect` (1º ou 2º), `pTop6` (3º a 6º), `pPlayoffPromotion` (sobe pelos playoffs), `pPromotion` (acesso total = direto + playoffs), `pRelegation` (17º a 20º).
- `positionDist[20]`: probabilidade de terminar em cada posição.
- `expectedPoints` e faixa de pontos (percentis 10, 50, 90).

Para **o Fortaleza**, adicionalmente, os **números mágicos**:
- `pointsFor90Direct`: menor pontuação final em que, nas simulações que terminaram com esse total, o Fortaleza subiu direto em ≥ 90% delas.
- `pointsFor90Top6`: idem para garantir G6.
- Traduzido em jogos: "Com {x} vitórias nos {n} jogos que faltam, a chance de subir direto passa de 90%."

### 8.6 Checagens de sanidade (rodar em teste e no script)

- Soma de `pDirect` de todos os times ≈ 2,0.
- Soma de `pTop6` ≈ 4,0; soma de `pRelegation` ≈ 4,0.
- Soma de `pPromotion` ≈ 4,0.
- Cada `positionDist` soma ≈ 1,0.
- Se alguma checagem falhar, o script **não publica** e sai com erro (o GitHub avisa por e-mail).

### 8.7 Como explicar para o torcedor

Na página, um botão discreto "Como calculamos?" abre um painel com texto simples:

> "Simulamos os jogos que faltam de todos os 20 times, 20 mil vezes. Cada jogo é sorteado levando em conta o ataque e a defesa de cada time em casa e fora, com peso maior para os jogos mais recentes. Depois contamos em quantas dessas temporadas o Fortaleza terminou em cada posição. É uma estimativa, não uma previsão garantida: futebol tem surpresa."

Mais a suposição sobre os playoffs, se o regulamento não tiver sido confirmado.

---

## 9. Features — especificação completa

### Ordem da página (de cima para baixo)

1. Cabeçalho fixo
2. **F1** — Topo "Como tá o Leão agora"
3. **F2** — A montanha-russa da temporada
4. **F3** — A corrida pelo acesso
5. **F4** — Simulador "E se?"
6. **F5** — Raio-X do time
7. Rodapé

O **F6** (card para compartilhar) aparece como botões dentro de F1 e F4, e como imagem de preview de link.

### Cabeçalho fixo

- Nome do site (texto, sem escudo oficial por padrão; ver [seção 10](#uso-de-escudos-e-marcas)).
- "Atualizado há X min/h" (relativo, a partir de `meta.updatedAt`).
- Em telas pequenas: chips de navegação rolável horizontalmente com âncoras (Agora, Temporada, Corrida, Simulador, Raio-X).
- Fundo com leve desfoque ao rolar.

---

### F1 — Topo "Como tá o Leão agora"

**Objetivo:** em 5 segundos o torcedor sabe onde o time está e qual a chance de subir.

**Conteúdo:**
- **Posição atual**, em tipografia enorme de placar (ex.: "2º").
- Frase de situação gerada por regra:
  - no G2: "Na zona de acesso direto"
  - 3º–6º: "Na zona dos playoffs"
  - 7º–16º: "Fora do G6, a {n} pontos da zona dos playoffs"
  - Z4: "Na zona de rebaixamento"
- **Pontos**, jogos disputados e distância para o 3º colocado (se no G2) ou para o 2º (se fora).
- **Sequência atual** (ex.: "10 jogos sem perder") com as bolinhas dos últimos 5.
- **Chance de acesso** (total), em número grande, com "direto: X%" e "via playoffs: Y%" logo abaixo.
- **Card do próximo jogo:**
  - Adversário (badge com sigla e cor), casa/fora, data e hora no fuso de Fortaleza, estádio.
  - Contagem regressiva (dias, horas, minutos).
  - Se o jogo estiver acontecendo (entre o horário de início e 2h depois): "Bola rolando agora!" no lugar da contagem.
  - Retrospecto no 1º turno contra esse adversário (ex.: "No 1º turno: Fortaleza 2 x 1").
  - Forma recente dos dois times (bolinhas).
- Botão **"Compartilhar"** → gera o card de story "Chance de acesso" (F6).

**Animação (o momento orquestrado da página):** ao carregar, a posição e a chance de acesso "contam" do zero até o valor (duração ~1,2s, easing suave). É a **única** animação automática grande da página; o resto só anima quando entra na tela ou quando o usuário interage.

**Estados especiais:**
- `seasonState = "playoffs"`: o topo vira "Playoffs: Fortaleza x {adversário}" com placar agregado.
- `seasonState = "finished"`: resultado final ("Acesso garantido!", "Ficou nos playoffs", etc.).
- Sem próximo jogo agendado: esconder o card do próximo jogo.

**Critérios de aceite:**
- Cabe inteiro em uma tela de celular 390×844 sem rolar (tirando o cabeçalho).
- Todos os números batem com `standings.json` e `simulation.json`.
- Respeita `prefers-reduced-motion` (sem contagem animada).

---

### F2 — A montanha-russa da temporada

**Objetivo:** o gráfico que o torcedor printa e compartilha. Conta a história da campanha: da lanterna na estreia até onde o time está hoje.

**Gráfico:**
- Eixo X: rodadas 1 a 38 (as não disputadas aparecem vazias, para dar noção de quanto falta).
- Eixo Y: posição de 1 a 20, **invertido** (1º no topo).
- **Faixas de fundo:**
  - G2 (1–2): azul claro com brilho sutil.
  - G6 (3–6): azul médio, mais discreto.
  - Z4 (17–20): **cinza hachurado** (não usar vermelho, que é a cor do clube e do destaque).
- **Linha do Fortaleza:** vermelha, grossa, com pontos em cada rodada. O ponto é colorido pelo resultado (V verde, E cinza, D escuro) ou fica uniforme — decidir no checkpoint visual.
- **Marcos** (até 6): ícone ou número pequeno sobre a linha; ao tocar, abre um balão com o texto (ex.: "Rodada 1: goleada de 4 x 0 para o Botafogo-SP. Lanterna.").
- **Tooltip ao tocar em qualquer rodada:** "Rodada 14 — 6º lugar, 22 pts — Fortaleza 2 x 0 CRB (casa)".
- **Opcional (toggle):** mostrar linhas finas e cinzas dos rivais da corrida, para comparar.
- **Opcional (se sobrar tempo):** linha pontilhada com a **chance de acesso ao longo das rodadas** (de `history.json`), em eixo secundário.

**Frase de destaque acima do gráfico** (automática):
- "Da lanterna na estreia ao {posição}º lugar: {n} posições escaladas."
- Ou, se o time caiu: "Do {melhor}º lugar na rodada {r} ao {atual}º hoje."

**Animação:** a linha "se desenha" da rodada 1 até a atual quando o gráfico entra na tela (uma vez só).

**Mobile:** o gráfico ocupa a largura inteira; rodadas no eixo X mostradas de 5 em 5; toque em vez de hover. Altura ~320px no celular, ~420px no desktop.

**Critérios de aceite:**
- Posição de cada rodada bate com `timeline.json`.
- Marcos confirmados pelo Lucas antes do lançamento.
- Legível em print de tela de celular (é o objetivo principal do gráfico).

---

### F3 — A corrida pelo acesso

**Objetivo:** mostrar o Fortaleza contra os rivais diretos, lado a lado.

**Layout:**
- Frase de destaque (da seção 7.7).
- Lista de até 7 linhas/blocos (um por time da corrida), ordenada pela tabela, com o Fortaleza destacado (borda ou fundo vermelho sutil).
- Cada linha mostra:
  - Posição, badge do time, nome.
  - Pontos (grande).
  - Bolinhas dos últimos 5 jogos.
  - Chance de subir (total) em barra horizontal, com o número ao lado.
  - Selo de dificuldade da tabela restante ("Difícil" / "Média" / "Tranquila").
  - "Pega {n} do G6" (jogos restantes contra o G6).
- Ao tocar numa linha: expande mostrando os jogos restantes daquele time (adversário, casa/fora, rodada) e as chances detalhadas (direto, playoffs, G6).
- Abaixo: **confrontos diretos restantes** entre os times da corrida, em lista curta ("Rodada 34: Fortaleza x Vila Nova — Castelão").

**No mobile**, evitar tabela larga: cada time é um bloco compacto de duas linhas. No desktop, pode virar uma grade.

**Critérios de aceite:**
- Os times da corrida seguem a regra da seção 7.7.
- As somas e contagens batem com `race.json`.
- A linha do Fortaleza é identificável em 1 segundo.

---

### F4 — Simulador "E se?"

**Objetivo:** o torcedor escolhe o resultado dos jogos que faltam e vê onde o Fortaleza termina. Responde "quantos pontos a gente precisa?".

**Layout:**
- Título + frase: "Escolha o resultado dos jogos que faltam e veja onde o Leão termina."
- **Lista dos jogos restantes do Fortaleza** (ordem cronológica). Cada jogo:
  - Rodada, data, adversário (badge), casa/fora.
  - Três botões grandes: **V**, **E**, **D** (e um estado "não escolhido", que deixa o modelo sortear).
  - Área de toque mínima de 44×44px.
- **Atalhos:** "Tudo vitória", "Vitória em casa, empate fora", "Limpar".
- **Painel de resultado** (fixo no rodapé da tela no celular, colapsável; lateral no desktop):
  - Pontos finais se os resultados escolhidos acontecerem (+ faixa estimada se houver jogos não escolhidos).
  - **Posição mais provável** e distribuição de posições (mini gráfico de barras 1–20, com destaque no G2/G6).
  - **Chance de acesso direto**, **de G6** e **de acesso total**, com animação de transição quando os números mudam.
  - Frase dinâmica:
    - ≥ 90% direto: "Com esses resultados, o acesso direto fica praticamente garantido."
    - 50–90%: "Boa chance de subir direto, mas ainda depende dos rivais."
    - G6 alto mas direto baixo: "Com isso, o caminho mais provável é pelos playoffs."
    - Z4 > 5%: "Cuidado: com esses resultados o risco lá embaixo aparece."
  - Número mágico: "Com {x} pontos, a chance de subir direto passa de 90%."
- Botão **"Compartilhar minha previsão"** → card de story "Minha previsão" (F6).

**Funcionamento técnico:**
- Endpoint **`GET /api/py/simular?p=VVEDV-V-E`** na FastAPI (Vercel). Lê `data/model.json` (empacotado junto da função), roda 5.000 simulações com o modelo de `pipeline/model` e devolve JSON com pontos finais, distribuição de posições, chances (direto, G6, acesso total, Z4) e o número mágico.
- **Semente derivada das escolhas** (hash do parâmetro `p` + rodada): mesmas escolhas, mesmo resultado.
- Entrada validada com pydantic (tamanho igual ao número de jogos restantes do Fortaleza; só `V`, `E`, `D` ou `-`). Entrada inválida → erro 422 com mensagem clara.
- Resposta com `Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600`. A CDN da Vercel guarda o resultado de cada combinação; como o cache é por deploy, cada atualização de dados usa números novos.
- **Aquecimento:** quando a seção do simulador estiver chegando na tela (IntersectionObserver), o front chama `GET /api/py/health` para acordar a função Python e evitar a espera do cold start no primeiro clique.
- No front (`lib/simulator-client.ts`): debounce de 400ms após cada clique, cancelar a requisição anterior com `AbortController`, e enquanto espera os números ficam levemente transparentes com um indicador sutil (não travar a tela). Se a API falhar: "Não deu para simular agora. Tente de novo em instantes."
- Os resultados escolhidos ficam na URL (ex.: `?p=VVEDV-V-E`, com `-` para não escolhido), para o link ser compartilhável e a escolha sobreviver a um recarregamento.
- **Opcional (se sobrar tempo):** modo avançado para fixar também os confrontos diretos dos rivais.

**Critérios de aceite:**
- Sem nenhuma escolha, os números batem (com margem de ~1 ponto percentual) com `simulation.json`.
- "Tudo vitória" resulta em acesso direto ≈ 100% (sanidade).
- "Tudo derrota" derruba a chance de forma coerente.
- Com a função aquecida, responde em menos de 1 segundo; o primeiro clique após cold start, em menos de 3 segundos.

---

### F5 — Raio-X do time

**Objetivo:** os dados herdados do painel de referência, só que visuais e explicados.

**Blocos** (cada um com uma frase de destaque em cima e um visual simples embaixo):

1. **Castelão x fora**
   - Duas colunas: "No Castelão" e "Fora de casa", com V/E/D, pontos e aproveitamento.
   - Visual: duas barras de aproveitamento lado a lado, ou dois "medidores" semicirculares.
2. **1º tempo x 2º tempo**
   - Gols pró e contra em cada tempo, saldo por tempo.
   - Visual: barras espelhadas (pró para cima, contra para baixo) ou dois blocos grandes com o saldo.
3. **Gols por faixa de minutos** (só se `hasGoalMinutes`)
   - Seis faixas, barras de gols pró (vermelho) e contra (cinza/azul claro).
   - Destaque na faixa mais forte e na mais fraca.
4. **Turno x returno**
   - Pontos por jogo e aproveitamento em cada turno; frase de comparação.
5. **Sequências**
   - Cards pequenos: sequência atual, maior invencibilidade, maior série de vitórias, jogos sem sofrer gol.

**Regra de ouro:** no máximo 3 números por bloco. O resto fica num "ver detalhes" expansível.

**Animação:** barras crescem quando o bloco entra na tela (uma vez).

**Critérios de aceite:**
- Frases com plural e arredondamento corretos.
- Se um dado não existir (ex.: sem minuto dos gols), o bloco some sem deixar buraco.

---

### F6 — Card para compartilhar

**Objetivo:** o torcedor compartilha no story/status e traz mais gente para o site.

**Dois modelos de imagem**, gerados por rotas `next/og`:

1. **"Chance de acesso"** — `/api/card/acesso`
   - 1080×1920 (story).
   - Posição atual, pontos, chance de acesso total em destaque gigante, "direto: X%", sequência atual, rodada, e o endereço do site no rodapé.
2. **"Minha previsão"** — `/api/card/previsao?p=VVEDV-V-E`
   - Os resultados escolhidos em lista compacta (adversário + V/E/D colorido), pontos finais, posição mais provável, chance de acesso nesse cenário, e "Faça a sua em {site}".
   - A rota chama `/api/py/simular` com as mesmas escolhas (a resposta normalmente já está no cache da CDN) para pegar os números da imagem.

**Botão de compartilhar:**
- No celular com suporte: `navigator.share({ files: [png], text, url })` → abre o menu nativo (WhatsApp, Instagram, etc.).
- Sem suporte: baixa o PNG e mostra "Imagem salva! Agora é só postar."
- Também oferecer "Copiar link".

**Preview de link (Open Graph):**
- `app/opengraph-image.tsx` gera uma imagem 1200×630 com posição + chance de acesso atual, para aparecer bonita quando o link for colado no WhatsApp/Twitter.
- Revalidar a cada atualização de dados (a imagem é gerada no build, que acontece a cada push).

**Detalhes técnicos:**
- Carregar as fontes do projeto como `ArrayBuffer` dentro da rota (requisito do `ImageResponse`).
- Seguir a mesma paleta do site.

**Critérios de aceite:**
- Imagem nítida, texto legível em miniatura.
- Testar compartilhamento real no WhatsApp e no Instagram (tarefa do Lucas no celular, ver seção 16).

---

### Rodapé

- "Projeto independente de torcedor. Sem vínculo com o Fortaleza Esporte Clube."
- "Dados: {provedor}. Atualizado em {data e hora}."
- Link "Como calculamos?" (abre o texto da seção 8.7).
- Crédito: "Feito por Lucas" (+ link que o Lucas quiser, perguntar no final).

---

## 10. Design system e direção visual

### Direção

**"Noite de jogo no Castelão."** Fundo azul profundo como o céu da noite de jogo, textos em branco, e o **vermelho** como a cor da emoção: aparece nos números mais importantes, na linha do Fortaleza, nos botões e nos destaques. Referências de vernáculo: placar eletrônico de estádio, faixas de torcida, a faixa tricolor.

### Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#081230` | fundo da página |
| `--surface` | `#0F1F4D` | blocos e painéis |
| `--surface-2` | `#16296A` | elementos elevados, hover |
| `--blue` | `#1D4ED8` | destaques azuis, faixa G2/G6 |
| `--red` | `#E11D2E` | cor de destaque principal: números-chave, linha do Fortaleza, botões |
| `--white` | `#FFFFFF` | texto principal |
| `--muted` | `#A8B4D8` | texto secundário, eixos |
| `--win` | `#22C55E` | bolinha de vitória |
| `--draw` | `#94A3B8` | bolinha de empate |
| `--loss` | `#475569` | bolinha de derrota (escura, para não competir com o vermelho do clube) — decidir no checkpoint se derrota será vermelha ou escura |

Regras:
- **Texto sempre branco ou `--muted`.** Nunca texto vermelho pequeno sobre o azul (contraste ruim). Vermelho em texto só em números grandes (≥ 32px) ou com fundo próprio (botões, selos).
- Z4 nunca em vermelho (cinza hachurado).
- Contraste mínimo WCAG AA em todo texto.

### Tipografia

- **Display (números e títulos):** fonte condensada estilo placar. Opções para o checkpoint: **Bebas Neue**, **Anton**, **Oswald**.
- **Texto:** uma sans legível. Opções para o checkpoint: **Inter**, **Manrope**, **DM Sans**.
- Carregar com `next/font/google`.
- Escala de tipos definida em tokens (ex.: 14 / 16 / 20 / 28 / 40 / 64 / 96px), com os números do topo usando os maiores tamanhos.
- Títulos em frase normal (sentence case), sem rótulos em caixa alta espaçada acima de cada seção.

### Layout e estilo

- Largura máxima de conteúdo ~1100px; no mobile, margens laterais de 16px.
- **Evitar o "kit de cards SaaS"** (todos os blocos iguais, mesma sombra, mesmo arredondamento). Variar a hierarquia: o topo é grande e aberto, sem caixa; a corrida é uma lista; o raio-x usa blocos; o simulador tem painel próprio.
- **A faixa tricolor** (vermelho, branco, azul) como elemento gráfico recorrente e contido: por exemplo, uma faixa fina no topo da página e no rodapé do card de compartilhar. Usar com moderação.
- Uma textura sutil de fundo (ex.: gradiente radial muito leve, como luz de refletor) só no topo. O resto do fundo é liso.
- **Ousadia concentrada em um lugar:** o topo com o número gigante de placar e a montanha-russa. O resto é disciplinado e calmo.

### Movimento

- Um único momento orquestrado: a contagem dos números do topo no carregamento.
- Montanha-russa se desenha ao entrar na tela (uma vez).
- Barras do raio-x crescem ao entrar na tela (uma vez).
- Simulador: transições nos números quando o usuário clica (resposta à ação).
- **Não** colocar animação de entrada em todas as seções nem efeito de hover em todos os blocos.
- Respeitar `prefers-reduced-motion`.

### Acessibilidade e qualidade mínima

- Foco de teclado visível.
- Botões do simulador com `aria-pressed`.
- Gráficos com resumo em texto (`aria-label`) para leitores de tela.
- Lighthouse mobile: Performance ≥ 90, Acessibilidade ≥ 95.

### Uso de escudos e marcas

- **Padrão:** não usar o escudo oficial do Fortaleza nem dos outros clubes. Os times aparecem como **badges com a sigla** (ex.: "FOR", "VIL") na cor principal do clube (`data/manual/teams.json`).
- O nome do site e o ícone (favicon) usam um elemento original (ex.: um leão estilizado simples desenhado em SVG pelo Claude Code, ou só tipografia).
- Se o Lucas quiser usar escudos mesmo assim, é decisão dele; registrar e seguir.

> **Decisões dos checkpoints 1 e 2 (28/09/2026):** nome **Fortaleza em Números**; fontes **Bebas Neue** (números e
> títulos) + **Inter** (texto); **vermelho contido** (no topo, só a chance de subir em vermelho); **bolinha de derrota
> vermelha**; montanha-russa **M1 ajustada**: linha **branca** com pontos verde (vitória), cinza (empate) e vermelho
> (derrota), faixas G2/G6 preenchidas e Z4 hachurada. Marco da troca de técnico: Autuori estreou na **rodada 21**
> (a rodada 20 teve técnico interino), confirmado pelo Lucas.

### CHECKPOINT VISUAL 1 (Dia 2, início)

Claude Code cria a rota `/preview` com:
- 2 ou 3 combinações de fonte display + fonte de texto aplicadas no topo real (com dados reais).
- Variações de uso do vermelho (mais contido x mais presente).
- 2 opções de bolinha de derrota (vermelha x escura).
- 2 opções de nome do site (sugestões: "Painel do Leão", "Termômetro do Leão", "Leão em Números"), deixando o Lucas sugerir outro.

Faz deploy de preview e manda o link para o Lucas escolher pelo celular.

### CHECKPOINT VISUAL 2 (Dia 2, meio)

Montanha-russa com duas variações de estilo de linha/pontos e das faixas de fundo.

### CHECKPOINT VISUAL 3 (Dia 3)

Os dois modelos de card de compartilhar, em duas variações cada.

---

## 11. Textos e tom de voz

- Fala de torcedor para torcedor, mas sem forçar gíria. "Leão" e "Tricolor" são bem-vindos. "Castelão" no lugar de "em casa" quando fizer sentido.
- Verbos simples, frases curtas, voz ativa.
- Sem termos técnicos: nada de "probabilidade", prefira "chance"; nada de "aproveitamento de 57,1%", prefira "57% dos pontos".
- Estimativas sempre tratadas como estimativas ("chance", "estimativa"), nunca como certeza.
- Botões dizem exatamente o que fazem: "Compartilhar", "Limpar escolhas", "Tudo vitória".
- Mensagens de erro/vazio dizem o que houve e o que fazer: "Os dados desta rodada ainda estão chegando. Volte daqui a pouco."
- O Claude Code escreve todos os textos da interface; o Lucas revisa no checkpoint final.

---

## 12. Estrutura de pastas

```
painel-do-leao/
├── .claude/
│   └── settings.json              # permissões liberadas para o Claude Code
├── .github/
│   └── workflows/
│       └── update-data.yml        # cron a cada 2h (Python)
│
├── pipeline/                      # TODO o Python de dados
│   ├── __init__.py
│   ├── config.py                  # IDs, constantes do modelo (SHRINK_GAMES, MEIA_VIDA...), caminhos
│   ├── models.py                  # modelos pydantic (entrada e saída)
│   ├── export_schema.py           # exporta JSON Schema para gerar tipos TS
│   ├── probe_api.py               # sondagem inicial da API
│   ├── build_reference.py         # gera manual/teams.json e manual/rounds.json (1x)
│   ├── http.py                    # cliente com pausa + retry/backoff
│   ├── fetch.py                   # decide o que consultar, fallback e contador de falhas
│   ├── update_data.py             # pipeline completo (roda no Actions)
│   ├── providers/
│   │   ├── base.py
│   │   ├── espn.py                # principal (decisão de 28/09)
│   │   └── footballsoccerapi.py   # reserva
│   ├── calc/                      # pode usar pandas
│   │   ├── standings.py
│   │   ├── timeline.py
│   │   ├── milestones.py
│   │   ├── streaks.py
│   │   ├── xray.py
│   │   ├── insights.py
│   │   ├── race.py
│   │   └── next_match.py
│   └── model/                     # SÓ numpy + pydantic (vai para a Vercel)
│       ├── ratings.py
│       ├── simulate.py
│       ├── playoffs.py
│       └── summarize.py           # probabilidades e números mágicos
│
├── api/
│   └── index.py                   # FastAPI: /api/py/health e /api/py/simular (função Python na Vercel)
│
├── tests/                         # pytest
│   ├── test_standings.py
│   ├── test_timeline.py
│   ├── test_streaks.py
│   ├── test_insights.py
│   ├── test_model.py
│   └── test_api.py                # FastAPI TestClient
│
├── app/                           # Next.js
│   ├── layout.tsx                 # fontes, metadata, analytics
│   ├── page.tsx                   # página única com as seções
│   ├── opengraph-image.tsx        # imagem de preview do link
│   ├── icon.svg                   # favicon
│   ├── preview/
│   │   └── page.tsx               # rota dos checkpoints visuais (esconder no lançamento)
│   └── api/
│       └── card/
│           ├── acesso/route.tsx   # card story "chance de acesso"
│           └── previsao/route.tsx # card story "minha previsão"
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── hero/                      # F1
│   ├── season-chart/              # F2
│   ├── race/                      # F3
│   ├── simulator/                 # F4
│   ├── xray/                      # F5
│   ├── share/                     # F6 (botões e lógica de compartilhar)
│   └── ui/                        # TeamBadge, FormDots, AnimatedNumber, Section etc.
├── lib/
│   ├── data.ts                    # leitura tipada dos JSON de /data
│   ├── format.ts                  # plural, percentuais, datas no fuso de Fortaleza
│   ├── simulator-client.ts        # chamadas à /api/py/simular (debounce, abort, aquecimento)
│   └── generated/                 # tipos TS GERADOS a partir do pydantic (não editar à mão)
│
├── data/
│   ├── meta.json, teams.json, matches.json, standings.json, timeline.json,
│   ├── race.json, xray.json, simulation.json, model.json, next-match.json, history.json
│   ├── manual/
│   │   ├── teams.json
│   │   ├── milestones.json
│   │   └── rounds.json            # só se necessário
│   └── raw/
│       ├── matches.json
│       └── state.json
├── schema/                        # JSON Schema exportado (gerado)
├── docs/
│   ├── PLANO.md                   # este arquivo
│   ├── api-report.md              # gerado pela sondagem
│   └── divulgacao.md              # textos prontos para postar
├── CLAUDE.md
├── pyproject.toml                 # grupos de dependência: api, pipeline, dev
├── uv.lock
├── requirements.txt               # GERADO a partir do grupo "api" (fastapi, numpy, pydantic) para a Vercel
├── vercel.json                    # inclui pipeline/model, pipeline/models.py, pipeline/config.py e data/model.json na função Python
├── next.config.ts                 # em dev: rewrite /api/py/* → FastAPI local na porta 8000
├── .env.example                   # FOOTBALL_API_KEY=, FOOTBALL_API_PROVIDER=
├── .gitignore                     # .env*, exceto .env.example; .venv; __pycache__
└── package.json
```

### Comandos (`package.json`)

```json
{
  "scripts": {
    "dev": "concurrently -n web,api \"next dev\" \"uv run uvicorn api.index:app --reload --port 8000\"",
    "dev:web": "next dev",
    "build": "next build",
    "start": "next start",
    "probe": "uv run python -m pipeline.probe_api",
    "update-data": "uv run python -m pipeline.update_data",
    "test": "uv run pytest -q",
    "gen:types": "uv run python -m pipeline.export_schema && json2ts -i schema -o lib/generated",
    "gen:requirements": "uv export --only-group api --no-hashes -o requirements.txt",
    "check": "tsc --noEmit && uv run pytest -q"
  }
}
```

O Lucas nunca precisa decorar isso: o Claude Code roda os comandos. `pnpm dev` sobe o site e a API do simulador juntos.

## 13. Automação: atualização sozinha a cada 2 horas

> **Atualização em 01/10/2026:** o GitHub pulava agendamentos (só 3 a 6 execuções por dia em vez de 12). O cron
> passou a tentar a cada 30 minutos, em minutos "quebrados" (`7,37 * * * *`). As chamadas à ESPN não mudam: o
> pipeline continua consultando só quando algum jogo já deveria ter terminado.

### Pipeline `pipeline/update_data.py`

1. Ler a chave de `os.environ["FOOTBALL_API_KEY"]` (em dev, carregada do `.env.local` via python-dotenv).
2. Decidir pelos horários em cache se há jogo que já terminou (senão, sair sem chamada). Buscar na ESPN só as datas necessárias; se falhar, usar a footballsoccerapi (ver decisão na seção 5). Validar com pydantic e mesclar com o cache (`data/matches.json`, `data/details.json`).
3. Identificar jogos do Fortaleza encerrados sem detalhe em cache e buscar os detalhes (com pausa e retry).
4. Normalizar tudo para os tipos da seção 6.
5. Rodar os cálculos da seção 7.
6. Rodar o modelo da seção 8 (20.000 simulações, semente fixa por rodada).
7. Rodar as checagens de sanidade (8.6). Se falhar: **sair com erro sem gravar nada**.
8. Gravar os JSON em `/data` com formatação estável (chaves ordenadas), para o Git só detectar mudança quando algo realmente mudou.
9. Atualizar `meta.updatedAt` **somente se algum dado mudou** (senão, todo run geraria commit).
10. Anexar ao `history.json` a chance de acesso do Fortaleza se a rodada concluída mudou.
11. Imprimir um resumo no log (jogos novos, rodada, chance de acesso).

### Workflow `.github/workflows/update-data.yml`

```yaml
name: Atualizar dados

on:
  schedule:
    - cron: "15 */2 * * *"   # a cada 2 horas, no minuto 15 (UTC)
  workflow_dispatch: {}       # permite rodar na mão pelo GitHub ou por `gh workflow run`

permissions:
  contents: write

concurrency:
  group: update-data
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true

      - run: uv python install 3.12

      - run: uv sync --frozen --all-groups

      - name: Atualizar dados
        run: uv run python -m pipeline.update_data
        env:
          FOOTBALL_API_KEY: ${{ secrets.FOOTBALL_API_KEY }}
          FOOTBALL_API_PROVIDER: ${{ vars.FOOTBALL_API_PROVIDER }}

      - name: Testes
        run: uv run pytest -q

      - name: Commit se houver mudança
        run: |
          if git diff --quiet -- data/; then
            echo "Sem mudanças nos dados."
            exit 0
          fi
          git config user.name "painel-bot"
          git config user.email "painel-bot@users.noreply.github.com"
          git add data/
          ROUND=$(python3 -c "import json; print(json.load(open('data/meta.json'))['lastCompletedRound'])")
          git commit -m "dados: atualização automática (rodada ${ROUND})"
          git push
```

Observações:
- Versões das actions: usar as mais recentes estáveis no momento.
- O cron do GitHub pode atrasar alguns minutos em horários de pico; isso é normal.
- Repositórios sem atividade por 60 dias têm o cron desativado pelo GitHub. Durante o campeonato isso não acontece (há commits automáticos), mas registrar no `CLAUDE.md`.
- **Configuração feita pelo Claude Code via CLI:**
  - `gh secret set FOOTBALL_API_KEY` (lendo do `.env.local`, sem exibir a chave).
  - `gh variable set FOOTBALL_API_PROVIDER --body "footballsoccerapi"`.
  - `gh workflow run update-data.yml` para testar logo após criar.
  - `gh run watch` para acompanhar e confirmar o sucesso.

### Deploy automático

- A Vercel fica conectada ao repositório: cada push na `main` gera deploy de produção; cada push em outra branch gera preview.
- Como os dados são lidos no build, o site sempre publica os dados mais recentes.

---

## 14. Deploy, domínio, SEO e analytics

### Vercel (feito pelo Claude Code via CLI)

1. `vercel login` (Lucas faz o login no navegador, uma vez).
2. `vercel link` para criar/vincular o projeto.
3. `vercel git connect` para ligar ao repositório do GitHub (deploy automático a cada push).
4. Variáveis de ambiente: o site em si **não precisa** da chave da API (lê só os JSON). Só adicionar variáveis se alguma rota precisar.
5. `vercel --prod` para o primeiro deploy, se necessário.
6. Habilitar Vercel Analytics (instalar `@vercel/analytics` e adicionar `<Analytics />` no layout; ativar no painel se a CLI não permitir — nesse caso, passo manual rápido do Lucas).

### Função Python (FastAPI) na Vercel

- `api/index.py` expõe `app = FastAPI()` com as rotas sob `/api/py/` (`/health` e `/simular`).
- Dependências da função: só o grupo `api` do `pyproject.toml` (fastapi, numpy, pydantic), exportado para `requirements.txt` com `pnpm gen:requirements`. O Claude Code confere na documentação atual da Vercel qual arquivo de dependências o runtime Python lê e ajusta se necessário.
- `vercel.json` configura a função para incluir `pipeline/model/**`, `pipeline/models.py`, `pipeline/config.py` e `data/model.json` no pacote.
- `next.config.ts`: em desenvolvimento, rewrite de `/api/py/:path*` para `http://127.0.0.1:8000/api/py/:path*`. Em produção, a Vercel roteia direto para a função.
- Depois de cada deploy importante, o Claude Code testa: `curl https://<site>/api/py/health` e uma chamada de `/api/py/simular`.
- Referência de estrutura: template oficial "Next.js FastAPI Starter" da Vercel.

### Domínio

- Padrão: usar o domínio grátis `*.vercel.app` (ex.: `painel-do-leao.vercel.app`). Claude Code tenta reservar um nome curto e bonito.
- Opcional: domínio próprio (compra é manual do Lucas; a configuração de DNS pode ser guiada ou feita via `vercel domains` pelo Claude Code).

### SEO e compartilhamento

- `metadata` no `layout.tsx`: título "Fortaleza em Números — o Leão na Série B 2026", descrição curta, `lang="pt-BR"`.
- Open Graph e Twitter card com a imagem dinâmica (F6).
- `robots.txt` e `sitemap.xml` via convenções do App Router.
- Favicon original (SVG).
- Cor de tema do navegador (`themeColor`) = `--bg`.

---

## 15. Testes e verificações

### Testes automatizados (pytest)

- **standings:** tabela com empates resolvidos corretamente (pontos → vitórias → saldo → gols pró). Caso real: Vila Nova à frente do Fortaleza por vitórias com 51 pontos cada.
- **timeline:** jogo adiado entra na classificação no momento em que foi disputado.
- **streaks:** sequência invicta e forma dos últimos 5.
- **insights:** plural ("1 jogo" x "2 jogos"), arredondamento, frase certa para cada condição.
- **model:**
  - Somas de probabilidade (seção 8.6).
  - Com semente fixa, resultado idêntico entre execuções.
  - "Tudo vitória" para o Fortaleza → acesso direto ≈ 100%.
  - Liga artificial com um time muito mais forte → esse time termina 1º na grande maioria das simulações.
  - Performance: 5.000 simulações em < 300ms.
- **api (FastAPI TestClient):** `/api/py/health` responde; `/api/py/simular` sem escolhas bate com `simulation.json` (±1 ponto percentual); entrada inválida retorna 422.

### Verificações manuais (Claude Code)

- Rodar `pnpm build` e navegar localmente.
- Conferir os números do topo contra uma fonte pública da tabela (pesquisa na web) e reportar diferenças.
- Rodar Lighthouse (via `npx lighthouse` ou equivalente) na URL de preview e corrigir o que ficar abaixo das metas.
- Verificar a página em larguras 360, 390, 768 e 1280px (screenshots com ferramenta de navegador headless, se disponível).

### Verificações do Lucas (no celular)

- Abrir o link de preview e navegar.
- Testar o simulador.
- Testar o compartilhamento no WhatsApp e no Instagram.
- Colar o link no WhatsApp e ver se o preview aparece bonito.

---

## 16. O que o Lucas faz manualmente (lista completa)

Tudo o que **não** está nesta lista, o Claude Code faz sozinho.

| # | Tarefa | Quando | Tempo estimado |
|---|---|---|---|
| M1 | **Criar conta e chave da API** em footballsoccerapi.com (e, se o Claude Code pedir, em api-football.com). Colar a chave no terminal quando o Claude Code pedir (ele grava no `.env.local` e no GitHub Secrets). | Dia 0 | 10 min |
| M2 | **Login no GitHub CLI** (`gh auth login`): o Claude Code roda o comando, o Lucas confirma o código no navegador. | Dia 0 | 2 min |
| M3 | **Login na Vercel CLI** (`vercel login`): mesmo esquema, confirmação no navegador. | Dia 0 | 2 min |
| M4 | **Aprovar as permissões do Claude Code** (arquivo `.claude/settings.json` e comandos que ele pedir). | Durante todo o projeto | contínuo |
| M5 | **Instalar programas que faltarem**, se o Claude Code não conseguir instalar sozinho (Node.js, Python 3.12+, uv, Git, gh, Vercel CLI). Em geral ele instala; o Lucas só aprova. | Dia 0 | 0–15 min |
| M6 | **Checkpoint visual 1**: escolher fontes, uso do vermelho, cor da derrota e nome do site. | Dia 2 | 10 min |
| M7 | **Checkpoint visual 2**: escolher estilo da montanha-russa. | Dia 2 | 5 min |
| M8 | **Confirmar os marcos da temporada** (textos e rodadas que o Claude Code pesquisou). | Dia 2 | 5 min |
| M9 | **Checkpoint visual 3**: escolher o visual dos cards de compartilhar. | Dia 3 | 5 min |
| M10 | **Testar no celular**: navegação, simulador, compartilhamento no WhatsApp/Instagram, preview do link. | Dia 3 | 15 min |
| M11 | **Revisar os textos finais** da página. | Dia 3 | 10 min |
| M12 | **Divulgar**: postar nas redes e grupos (textos prontos em `docs/divulgacao.md`). | Lançamento | 20 min |
| M13 | (Opcional) Ativar o Analytics no painel da Vercel, se a CLI não fizer. | Dia 3 | 2 min |
| M14 | (Opcional) Comprar domínio próprio. | Quando quiser | — |

---

## 17. Roteiro de execução em 3 dias

### Dia 0 — Preparação (1 a 2 horas, pode ser na véspera)

**Claude Code:**
1. Verificar ferramentas instaladas (Node 20+, pnpm, Python 3.12+, uv, git, gh, vercel). Instalar o que faltar (pedindo aprovação).
2. Criar o projeto Next.js com TypeScript, Tailwind, ESLint, App Router, pnpm. Criar o projeto Python com `uv init` na mesma pasta (`pyproject.toml` com os grupos `api`, `pipeline` e `dev`).
3. Criar `.gitignore`, `.env.example`, `.claude/settings.json`, `CLAUDE.md`, `docs/PLANO.md`.
4. Criar o repositório no GitHub via `gh repo create` (perguntar ao Lucas só: público ou privado; padrão sugerido: **público**, que tem minutos ilimitados de Actions) e fazer o primeiro push.
5. Pedir ao Lucas a chave da API (M1) e gravar em `.env.local`.
6. Implementar e rodar `pipeline/probe_api.py`. Gerar `docs/api-report.md`.
7. Decidir o provedor (seção 5) e reportar ao Lucas em 3 linhas: o que a API tem, o que não tem, e se alguma feature muda.

**Pronto quando:** repositório no GitHub, projeto rodando localmente, relatório da API gerado, provedor decidido.

### Dia 1 — Dados e modelo (o motor do projeto)

**Claude Code:**
1. Modelos pydantic (`pipeline/models.py`), provedor escolhido (`pipeline/providers/`) e geração automática dos tipos TypeScript (`pnpm gen:types`).
2. `data/manual/teams.json`: siglas e cores dos 20 clubes (pesquisar).
3. Cálculos em `pipeline/calc/`: `standings`, `timeline`, `streaks`, `xray`, `insights`, `race`, `milestones`, `next_match` + testes pytest.
4. Modelo em `pipeline/model/` (numpy): `ratings`, `simulate`, `playoffs`, `summarize` + testes de sanidade e performance.
5. Pesquisar o regulamento dos playoffs (seção 2) e aplicar; registrar suposições.
6. Pesquisar os marcos manuais (troca de técnico etc.) e redigir `data/manual/milestones.json` para o Lucas confirmar depois.
7. `pipeline/update_data.py` completo, gerando todos os JSON.
8. Workflow do GitHub Actions, secrets e variável via `gh`; disparar com `gh workflow run` e confirmar sucesso com `gh run watch`.
9. FastAPI (`api/index.py`) com `/api/py/health` e `/api/py/simular` + testes; `requirements.txt` e `vercel.json` configurados.
10. Vercel: `vercel login` (M3), `vercel link`, `vercel git connect`. Publicar uma página provisória que mostra os números principais em texto puro e confirmar que `/api/py/simular` responde em produção, validando o fluxo ponta a ponta.

**Pronto quando:** o Actions roda sozinho, gera os JSON, faz commit e a Vercel publica a página provisória com os números corretos; a API do simulador responde em produção. Todos os testes passando.

### Dia 2 — O site

**Claude Code:**
1. Design tokens (cores, fontes, espaçamentos) no Tailwind; componentes base (`TeamBadge`, `FormDots`, `AnimatedNumber`, `Section`).
2. Rota `/preview` e **CHECKPOINT VISUAL 1**. Enquanto o Lucas escolhe, seguir com a estrutura das seções usando os tokens provisórios.
3. Aplicar as escolhas do Lucas.
4. **F1 — Topo** completo, com contagem animada, próximo jogo e contagem regressiva.
5. **F2 — Montanha-russa** + **CHECKPOINT VISUAL 2** + pedir confirmação dos marcos (M8).
6. **F3 — Corrida pelo acesso.**
7. **F5 — Raio-X.**
8. Cabeçalho, rodapé, "Como calculamos?".
9. Deploy de preview e link para o Lucas acompanhar no celular.

**Pronto quando:** página com F1, F2, F3 e F5 no ar (preview), com dados reais, visual aprovado.

### Dia 3 — Simulador, compartilhamento e lançamento

**Claude Code:**
1. **F4 — Simulador "E se?"** consumindo `/api/py/simular`, com aquecimento, estado na URL, atalhos e painel de resultado.
2. **F6 — Cards de compartilhar** (`/api/card/acesso` e `/api/card/previsao`) + **CHECKPOINT VISUAL 3**.
3. Imagem Open Graph dinâmica.
4. Botões de compartilhar com Web Share API e fallback.
5. Polimento: estados vazios/erro, `prefers-reduced-motion`, acessibilidade, testes em várias larguras, Lighthouse.
6. Remover ou esconder a rota `/preview` (ou protegê-la com um parâmetro secreto).
7. Escrever `docs/divulgacao.md` com textos prontos (seção 18).
8. Pedir ao Lucas os testes no celular (M10) e revisão de textos (M11). Corrigir o que ele apontar.
9. Deploy de produção. Rodar o workflow manualmente uma última vez para garantir dados frescos.

**Pronto quando:** site em produção, todas as features funcionando no celular, compartilhamento testado de verdade.

### Ordem de cortes (se atrasar)

Cortar nesta ordem, uma de cada vez, até caber no prazo:

1. Linha de chance de acesso ao longo das rodadas (`history.json`) na montanha-russa.
2. Linhas dos rivais na montanha-russa.
3. Modo avançado do simulador (fixar jogos dos rivais).
4. Gols por faixa de minutos no raio-x.
5. Card "Minha previsão" (fica só o "Chance de acesso").
6. Simulação dos playoffs (mostrar só chance de G2 e de G6; "acesso total" some).

**Nunca cortar:** modelo com os rivais, F1, F2 (versão básica), F4 (versão básica).

---

## 18. Lançamento e divulgação

### Melhor momento

Logo **depois de um jogo do Fortaleza** (a torcida está conectada e o painel acabou de atualizar) ou na véspera de um confronto direto.

### Textos prontos (Claude Code escreve em `docs/divulgacao.md`)

Gerar, com os números reais do momento:
- 3 versões de post para o Twitter/X (uma curta com o dado mais impactante, uma com o print da montanha-russa, uma chamando para o simulador).
- 1 mensagem para grupos de WhatsApp de torcedores.
- 1 legenda para story no Instagram (usando o card de compartilhar).
- Sugestão de resposta curta para usar em comentários de perfis de notícias do clube, sem parecer spam.

### Onde divulgar (tarefa do Lucas)

- Perfil pessoal no Twitter/X, marcando perfis de torcida e jornalistas que cobrem o Fortaleza.
- Grupos de WhatsApp e Telegram de torcedores.
- Comunidades e fóruns do clube.
- Stories do Instagram.

---

## 19. Riscos e planos B

| Risco | Impacto | Plano B |
|---|---|---|
| Plano grátis da API não cobre a Série B 2026 com todos os times | Alto | Testar API-Football; em último caso, plano pago mais barato por 1 mês |
| API não traz número da rodada | Médio | `data/manual/rounds.json` gerado pelo Claude Code a partir da tabela da CBF |
| API não traz minuto dos gols | Baixo | Desligar bloco de faixas de minutos (flag) |
| API não traz placar do intervalo | Baixo | Desligar bloco 1º x 2º tempo |
| API muda o formato da resposta | Médio | Validação pydantic faz o script falhar sem publicar; e-mail do GitHub avisa; site fica com os últimos dados |
| Cron do GitHub atrasa | Baixo | Normal; `workflow_dispatch` permite rodar na mão (`gh workflow run`) |
| Regulamento dos playoffs não encontrado | Baixo | Usar suposição padrão e deixar explícito em "Como calculamos?" |
| Cold start da função Python deixa o 1º clique lento | Médio | Aquecimento via `/api/py/health`, cache na CDN, reduzir para 3.000 simulações se preciso |
| Função Python passa do limite de tamanho da Vercel | Baixo | API só com fastapi + numpy + pydantic; pandas e httpx ficam só no pipeline |
| Configuração Next.js + Python na Vercel dá problema | Médio | Seguir o template "Next.js FastAPI Starter"; em último caso, publicar a FastAPI como um segundo projeto Vercel separado |
| Prazo de 3 dias estoura | Médio | Ordem de cortes da seção 17 |
| Uso de marca/escudo | Baixo | Padrão sem escudos oficiais + aviso de projeto independente |

---

## 20. Backlog pós-lançamento

Ideias boas que ficaram de fora do MVP, em ordem sugerida:

1. **Jogadores:** artilharia, assistências, participação em gols, craque da campanha (se a API tiver).
2. **Resumo da rodada com IA:** parágrafo automático após cada jogo, gerado a partir dos dados.
3. **Chance de acesso ao longo da temporada** (se não entrou no MVP).
4. **Temporada completa:** Copa do Nordeste, Copa do Brasil e Cearense.
5. **Público no Castelão** jogo a jogo.
6. **Retrospecto histórico** contra o próximo adversário.
7. **Comparação com a campanha de 2018** (último acesso).
8. **Modo playoffs** dedicado, com chaveamento visual.
9. **Adaptação para 2027** (Série A, se o Leão subir): trocar a liga no provedor e ajustar as faixas (G4/G6 da Libertadores, Z4).

---

## 21. Prompt inicial para colar no Claude Code

Salve este arquivo como `PLANO.md` numa pasta vazia, abra o Claude Code nessa pasta e cole:

```
Leia o arquivo PLANO.md inteiro antes de qualquer coisa. Ele é o plano completo
do projeto e você é o executor principal.

Regras principais:
- Dados, requisições à API, cálculos e simulações em Python (pastas pipeline/ e api/);
  o site em Next.js. Não precisa me ensinar passo a passo, só construir e me manter
  informado.
- Faça sozinho tudo que puder ser automatizado: criar arquivos, instalar dependências,
  configurar Git, GitHub (via gh), Vercel (via vercel CLI), GitHub Actions, secrets,
  testes, pesquisa na web e textos.
- Só me peça o que estiver na seção 16 (chave da API, logins no navegador, permissões,
  escolhas visuais, testes no celular e divulgação). Quando pedir, me dê o passo a passo
  exato e curto.
- Nos CHECKPOINTS VISUAIS, me mostre opções reais (rota /preview ou link de preview)
  e continue avançando no que não depende da minha escolha.
- Siga o roteiro da seção 17, começando pelo Dia 0. Ao final de cada fase, me mande
  um resumo curto: o que ficou pronto, link do preview e o que precisa de mim.
- Se o prazo apertar, siga a ordem de cortes da seção 17.

Comece agora pelo Dia 0.
```

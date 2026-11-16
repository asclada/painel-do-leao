import { CampaignStats } from "@/components/campaign/CampaignStats";
import { ChanceHistory, chanceHeadline } from "@/components/chance/ChanceHistory";
import { RoundContent } from "@/components/content/RoundContent";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/hero/Hero";
import { keyGamesMetric, PraSecar } from "@/components/key-games/KeyGames";
import { Projection, projectionHeadline } from "@/components/projection/Projection";
import { Race } from "@/components/race/Race";
import { SeasonChartSection } from "@/components/season-chart";
import { MatchList } from "@/components/season-chart/MatchList";
import { PalpiteSection } from "@/components/palpite";
import { PixelPitch } from "@/components/pitch/PixelPitch";
import { SimulatorSection } from "@/components/simulator";
import { Collapsible } from "@/components/ui/Collapsible";
import { Section } from "@/components/ui/Section";
import { XRay } from "@/components/xray/XRay";
import { Confronto, confrontoHeadline } from "@/components/playoffs/Confronto";
import { ConfrontoSimulatorSection } from "@/components/playoffs/ConfrontoSimulatorSection";
import { ModelCheck, modelCheckHeadline } from "@/components/playoffs/ModelCheck";
import { Retrospective } from "@/components/playoffs/Retrospective";
import { TaleOfTape } from "@/components/playoffs/TaleOfTape";
import { fortalezaRow, history, keyGames, meta, playoffMode, playoffs, retro, teamById, timeline } from "@/lib/data";
import { focus, focusTie, legForFocus, legName } from "@/lib/playoffs";
import { SITE_URL } from "@/lib/site";
import { ANCHOR_REVEAL_SCRIPT } from "@/lib/anchor-reveal";
import { plural } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

/** Menu dos pontos corridos e o dos playoffs (as âncoras antigas continuam valendo nos pontos corridos). */
const NAV_REGULAR: [string, string][] = [
  ["agora", "Agora"],
  ["palpite", "Palpite"],
  ["campanha", "Campanha"],
  ["chance", "Chances"],
  ["simulador", "Simulador"],
  ["corrida", "Corrida"],
  ["para-postar", "Compartilhar"],
];
const NAV_PLAYOFFS: [string, string][] = [
  ["agora", "Agora"],
  ["palpite", "Palpite"],
  ["confronto", "Confronto"],
  ["raio-x-confronto", "Raio-x"],
  ["simulador", "Simulador"],
  ["retrospectiva", "Campanha"],
  ["para-postar", "Compartilhar"],
];

export default function Home() {
  // depois de vitória do Leão (pontos corridos ou playoffs), a turma do campinho comemora ao abrir a página
  const lastGame = timeline.points.filter((p) => p.result).at(-1);
  const lastLeg = focusTie?.legs.filter((l) => l.status === "finished").at(-1);
  const lastLegScore = lastLeg ? legForFocus(lastLeg) : null;
  const celebrate = lastLegScore ? lastLegScore.f > lastLegScore.o : lastGame?.result === "V";

  return (
    <>
      <Header name={SITE_NAME} updatedAt={meta.updatedAt} nav={playoffMode && playoffs?.focus ? NAV_PLAYOFFS : NAV_REGULAR} />
      <DataStatusBanner />
      <main>
        <PixelPitch celebrate={celebrate} />
        <Hero />

        {playoffMode && playoffs?.focus ? <PlayoffSections /> : <RegularSections />}

        <Section id="raio-x" tight eyebrow={playoffMode && playoffs?.focus ? "Para ir além" : undefined} title="Raio-X do time">
          <Collapsible
            cta="Ver o raio-x do time"
            openOnHash="raio-x"
            description="Casa x fora, 1º x 2º tempo, gols por faixa de minutos e as sequências da temporada."
          >
            <XRay />
          </Collapsible>
        </Section>

        {lastGame && (
          <Section id="jogos-da-campanha" tight title="Os jogos da campanha">
            <MatchList />
          </Section>
        )}

        <Section
          id="para-postar"
          eyebrow="Para compartilhar"
          title="Conteúdo da rodada"
          headline="Cards prontos para postar depois de cada jogo. Eles se atualizam sozinhos: é só escolher e compartilhar."
        >
          <Collapsible
            cta="Ver os cards para postar"
            openOnHash="para-postar"
            description="Chances de acesso, a conta que mudou, o próximo jogo e a curiosidade da rodada, no tamanho do story."
          >
            <RoundContent />
          </Collapsible>
        </Section>
      </main>
      {/* logo depois das seções: acerta os pulos para âncoras com as seções desenhadas sob demanda */}
      <script dangerouslySetInnerHTML={{ __html: ANCHOR_REVEAL_SCRIPT }} />
      <Footer />
    </>
  );
}

/** Pontos corridos (até a rodada 38): palpite, campanha, chances e as ferramentas recolhidas. */
function RegularSections() {
  return (
    <>
          {/* Ordem (01/10, proposta do Lucas): o foco é o Fortaleza em números. Primeiro o que o torcedor faz nesta rodada,
              depois os números do Leão abertos (campanha e chances) e, no fim, as ferramentas e os detalhes recolhidos
              ("Para ir além", em sequência mais compacta). Os rótulos (eyebrow) abrem cada bloco. */}
          <Section
            id="palpite"
            eyebrow="Esta rodada"
            title="Palpite da rodada"
            headline="Crave o placar do próximo jogo do Leão. Resultado certo vale 2 pontos; placar exato, 5. Sem cadastro: fica guardado no seu celular."
          >
            <PalpiteSection />
          </Section>

          <Section id="campanha" eyebrow="A campanha" title="A campanha em números">
            <CampaignStats row={fortalezaRow} />
          </Section>

          <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
            <SeasonChartSection />
          </Section>

          <Section id="chance" eyebrow="As chances" title="Como a chance mudou" headline={chanceHeadline()}>
            <ChanceHistory />
          </Section>

          <Section id="rodada-38" title="Até a rodada 38" headline={projectionHeadline()}>
            <Projection />
          </Section>

          <Section id="simulador" eyebrow="Para ir além" tight lazyRender={false} title="Simulador dos próximos jogos" headline="Escolha o resultado dos jogos que faltam e veja onde o Leão termina.">
            {/* links do Desafio do Leão e do "Minha previsão" (?p=, ?a=, ?b=, #simulador) abrem o simulador sozinhos */}
            <Collapsible
              cta="Abrir o simulador"
              openOnHash="simulador"
              openOnParams={["p", "a", "b", "x"]}
              warmSimulator
              description="Escolha vitória, empate ou derrota em cada jogo, veja a chance do Leão com os seus resultados e desafie os amigos."
            >
              <SimulatorSection />
            </Collapsible>
          </Section>

          {keyGames.round != null && (
            <Section
              id="pra-secar"
              tight
              title="Pra secar nesta rodada"
              headline={`Rodada ${keyGames.round}: os jogos dos rivais que mais mexem na chance de ${keyGamesMetric} do Leão, e para quem torcer em cada um.`}
            >
              <Collapsible
                cta="Ver para quem torcer"
                openOnHash="pra-secar"
                description={
                  keyGames.rivals.length > 0
                    ? `${plural(keyGames.rivals.length, "jogo importa", "jogos importam")} para o Leão nesta rodada. Veja para quem torcer em cada um e como a chance muda com cada resultado.`
                    : "Nenhum jogo dos rivais mexe de verdade na chance do Leão nesta rodada."
                }
              >
                <PraSecar />
              </Collapsible>
            </Section>
          )}

          <Section id="corrida" tight title="A corrida pelo acesso">
            <Collapsible
              cta="Ver a corrida completa"
              openOnHash="corrida"
              description="A situação dos times que brigam pelo acesso, as chances de cada um, a tabela que falta e os confrontos diretos até o fim."
            >
              <Race />
            </Collapsible>
          </Section>
    </>
  );
}

/**
 * Playoffs: primeiro o confronto (palpite, do que o Leão precisa, raio-x lado a lado e o simulador), depois a história
 * da campanha (retrospectiva, números, montanha-russa) e a conferência do modelo. Saem as chances de acesso direto e
 * de ir aos playoffs, a corrida, o "Pra secar" e o "Até a rodada 38", que já foram decididos.
 */
function PlayoffSections() {
  if (!focus) return null;
  const opp = teamById[focus.opponentId];
  const leg = focus.nextLeg;
  const g6Points = history.map((h) => ({ round: h.round, p: Math.min(1, h.pDirect + h.pTop6), position: h.position }));
  return (
    <>
      {leg !== null && (
        <Section
          id="palpite"
          eyebrow="O confronto"
          title={`Palpite do ${legName(leg).toLowerCase()}`}
          headline={`Crave o placar de ${leg === 1 ? `${opp.name} x Fortaleza` : `Fortaleza x ${opp.name}`}. Resultado certo vale 2 pontos; placar exato, 5. Sem cadastro: fica guardado no seu celular.`}
        >
          <PalpiteSection />
        </Section>
      )}

      <Section id="confronto" eyebrow={leg === null ? "O confronto" : undefined} title="Do que o Leão precisa" headline={confrontoHeadline()}>
        <Confronto />
      </Section>

      <Section
        id="raio-x-confronto"
        title="Raio-x do confronto"
        headline={`Fortaleza e ${opp.name} lado a lado, com os números dos 38 jogos da Série B.`}
      >
        <TaleOfTape />
      </Section>

      <Section id="simulador" tight title="Simulador do confronto" headline="Escolha o placar da ida e da volta e veja quem sobe.">
        <Collapsible
          cta="Abrir o simulador"
          openOnHash="simulador"
          openOnParams={["c"]}
          description="Monte o seu confronto, veja o placar somado e quem sobe pela regra do regulamento, e compartilhe com os amigos."
        >
          <ConfrontoSimulatorSection />
        </Collapsible>
      </Section>

      {retro && (
        <Section
          id="retrospectiva"
          eyebrow="A campanha"
          title="A campanha em momentos"
          headline={`Da largada em ${retro.moments[0]?.position ?? ""}º ao ${fortalezaRow.position}º lugar: o caminho do Leão nos pontos corridos e como a chance de G6 mudou em cada momento.`}
        >
          <Retrospective
            retro={retro}
            points={g6Points}
            siteUrl={SITE_URL}
            shareText={`A campanha do Fortaleza na Série B em momentos, no ${SITE_NAME}:`}
          />
        </Section>
      )}

      <Section id="campanha" title="A campanha em números">
        <CampaignStats row={fortalezaRow} />
      </Section>

      <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
        <SeasonChartSection />
      </Section>

      <Section id="modelo" title="O modelo acertou?" headline={modelCheckHeadline()}>
        <ModelCheck />
      </Section>
    </>
  );
}

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
import { fortalezaRow, keyGames, meta, timeline } from "@/lib/data";
import { ANCHOR_REVEAL_SCRIPT } from "@/lib/anchor-reveal";
import { plural } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  // depois de vitória do Leão, a turma do campinho comemora ao abrir a página
  const lastGame = timeline.points.filter((p) => p.result).at(-1);

  return (
    <>
      <Header name={SITE_NAME} updatedAt={meta.updatedAt} />
      <DataStatusBanner />
      <main>
        <PixelPitch celebrate={lastGame?.result === "V"} />
        <Hero />

        {/* Ordem pensada para o torcedor (30/09): o que fazer nesta rodada, a briga pelo acesso, a campanha, os
            números para quem gosta e, por último, o que compartilhar. Os rótulos (eyebrow) abrem cada bloco. */}
        <Section
          id="palpite"
          eyebrow="Esta rodada"
          title="Palpite da rodada"
          headline="Crave o placar do próximo jogo do Leão. Resultado certo vale 2 pontos; placar exato, 5. Sem cadastro: fica guardado no seu celular."
        >
          <PalpiteSection />
        </Section>

        {keyGames.round != null && (
          <Section
            id="pra-secar"
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

        <Section id="corrida" eyebrow="A briga pelo acesso" title="A corrida pelo acesso">
          <Collapsible
            cta="Ver a corrida completa"
            openOnHash="corrida"
            description="A situação dos times que brigam pelo acesso, as chances de cada um, a tabela que falta e os confrontos diretos até o fim."
          >
            <Race />
          </Collapsible>
        </Section>

        <Section id="rodada-38" title="Até a rodada 38" headline={projectionHeadline()}>
          <Projection />
        </Section>

        <Section id="simulador" lazyRender={false} title="Simulador dos próximos jogos" headline="Escolha o resultado dos jogos que faltam e veja onde o Leão termina.">
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

        <Section id="campanha" eyebrow="A campanha" title="A campanha em números">
          <CampaignStats row={fortalezaRow} />
        </Section>

        <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
          <SeasonChartSection />
          <MatchList />
        </Section>

        <Section id="chance" eyebrow="Para quem gosta de números" quiet title="Como a chance mudou" headline={chanceHeadline()}>
          <ChanceHistory />
        </Section>

        <Section id="raio-x" quiet title="Raio-X do time">
          <XRay />
        </Section>

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

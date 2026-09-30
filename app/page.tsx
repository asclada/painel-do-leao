import { CampaignStats } from "@/components/campaign/CampaignStats";
import { RoundOneQuiz } from "@/components/campaign/RoundOneQuiz";
import { ChanceHistory, chanceHeadline } from "@/components/chance/ChanceHistory";
import { RoundContent } from "@/components/content/RoundContent";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/hero/Hero";
import { KeyGames } from "@/components/key-games/KeyGames";
import { MeuLeaoSection } from "@/components/meu-leao";
import { Projection, projectionHeadline } from "@/components/projection/Projection";
import { Race } from "@/components/race/Race";
import { SeasonChartSection } from "@/components/season-chart";
import { MatchList } from "@/components/season-chart/MatchList";
import { PalpiteSection } from "@/components/palpite";
import { PixelPitch } from "@/components/pitch/PixelPitch";
import { SimulatorSection } from "@/components/simulator";
import { Section } from "@/components/ui/Section";
import { XRay } from "@/components/xray/XRay";
import { scoreLine } from "@/lib/chance";
import { fortalezaRow, keyGames, meta, timeline } from "@/lib/data";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  const roundOne = timeline.points.find((p) => p.round === 1);
  // depois de vitória do Leão, a turma do campinho comemora ao abrir a página
  const lastGame = timeline.points.filter((p) => p.result).at(-1);

  return (
    <>
      <Header name={SITE_NAME} updatedAt={meta.updatedAt} />
      <DataStatusBanner />
      <main>
        <PixelPitch celebrate={lastGame?.result === "V"} />
        <Hero />

        <Section
          id="palpite"
          title="Palpite da rodada"
          headline="Crave o placar do próximo jogo do Leão. Resultado certo vale 2 pontos; placar exato, 5. Sem cadastro: fica guardado no seu celular."
        >
          <PalpiteSection />
        </Section>

        <Section id="campanha" title="A campanha em números" className="!pt-6 sm:!pt-10">
          <CampaignStats row={fortalezaRow} />
          {roundOne?.result && (
            <RoundOneQuiz position={roundOne.position} score={scoreLine(roundOne)} nowPosition={fortalezaRow.position} />
          )}
        </Section>

        <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
          <SeasonChartSection />
          <MatchList />
        </Section>

        <Section id="chance" title="Como a chance mudou" headline={chanceHeadline()}>
          <ChanceHistory />
        </Section>

        <Section id="corrida" title="A corrida pelo acesso">
          <Race />
        </Section>

        {keyGames.focus.length > 0 && (
          <Section
            id="jogos-chave"
            title="Os jogos que mais mexem na chance"
            headline="Quanto a chance de subir muda com cada resultado, do Leão e dos rivais."
          >
            <KeyGames />
          </Section>
        )}

        <Section id="simulador" title="Simulador dos próximos jogos" headline="Escolha o resultado dos jogos que faltam e veja onde o Leão termina.">
          <SimulatorSection />
        </Section>

        <Section id="rodada-38" title="Até a rodada 38" headline={projectionHeadline()}>
          <Projection />
        </Section>

        <Section id="raio-x" title="Raio-X do time">
          <XRay />
        </Section>

        <Section
          id="meu-leao"
          title="Meu Leão"
          headline="Responda 4 perguntas e ganhe um cartão de torcedor para o story."
        >
          <MeuLeaoSection />
        </Section>

        <Section
          id="para-postar"
          title="Conteúdo da rodada"
          headline="Cards prontos para postar depois de cada jogo. Eles se atualizam sozinhos: é só escolher e compartilhar."
        >
          <RoundContent />
        </Section>
      </main>
      <Footer />
    </>
  );
}

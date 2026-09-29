import { CampaignStats } from "@/components/campaign/CampaignStats";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/hero/Hero";
import { Projection, projectionHeadline } from "@/components/projection/Projection";
import { Race } from "@/components/race/Race";
import { SeasonChartSection } from "@/components/season-chart";
import { MatchList } from "@/components/season-chart/MatchList";
import { SimulatorSection } from "@/components/simulator";
import { Section } from "@/components/ui/Section";
import { XRay } from "@/components/xray/XRay";
import { fortalezaRow, meta, timeline } from "@/lib/data";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Header name={SITE_NAME} updatedAt={meta.updatedAt} />
      <main>
        <Hero />

        <Section id="campanha" title="A campanha em números" className="!pt-6 sm:!pt-10">
          <CampaignStats row={fortalezaRow} />
        </Section>

        <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
          <SeasonChartSection />
          <MatchList />
        </Section>

        <Section id="corrida" title="A corrida pelo acesso">
          <Race />
        </Section>

        <Section id="rodada-38" title="Até a rodada 38" headline={projectionHeadline()}>
          <Projection />
        </Section>

        <Section id="simulador" title="Simulador dos próximos jogos" headline="Escolha o resultado dos jogos que faltam e veja onde o Leão termina.">
          <SimulatorSection />
        </Section>

        <Section id="raio-x" title="Raio-X do time">
          <XRay />
        </Section>
      </main>
      <Footer />
    </>
  );
}

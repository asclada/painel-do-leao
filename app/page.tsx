import { SimulatorCheck } from "@/app/simulator-check";
import { Header } from "@/components/Header";
import { Hero } from "@/components/hero/Hero";
import { Section } from "@/components/ui/Section";
import { meta, race, simulation, teamById, timeline, xray } from "@/lib/data";
import { pct } from "@/lib/format";

export default function Home() {
  return (
    <>
      <Header name="Painel do Leão" updatedAt={meta.updatedAt} />
      <main>
        <Hero />

        {/* Seções abaixo ainda provisórias (Dia 2 em andamento) */}
        <Section id="temporada" title="A montanha-russa da temporada" headline={timeline.headline}>
          <p className="text-sm text-muted">Posição por rodada: {timeline.points.map((p) => p.position).join(" · ")}</p>
        </Section>

        <Section id="corrida" title="A corrida pelo acesso" headline={race.headline}>
          <ol className="space-y-1">
            {race.teams.map((t) => (
              <li key={t.teamId}>
                {t.position}º {teamById[t.teamId].name} — {t.points} pts · acesso {pct(t.pPromotion)}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="simulador" title="E se?" headline="Escolha o resultado dos jogos que faltam e veja onde o Leão termina.">
          <SimulatorCheck games={simulation.magic.remainingGames} />
        </Section>

        <Section id="raio-x" title="Raio-X do time">
          <ul className="list-disc space-y-1 pl-5">
            {Object.entries(xray.insights).map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </Section>
      </main>
    </>
  );
}

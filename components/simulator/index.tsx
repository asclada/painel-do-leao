import { Simulator } from "@/components/simulator/Simulator";
import { baselineScenario, focusFixtures, teamById } from "@/lib/data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** F4 — monta os jogos restantes no servidor e entrega ao simulador (cliente). */
export function SimulatorSection() {
  if (focusFixtures.length === 0) {
    return <p className="text-lg text-muted">A fase de pontos corridos acabou: não há mais jogos para simular.</p>;
  }
  const fixtures = focusFixtures.map((f) => ({
    matchId: f.matchId,
    round: f.round,
    kickoffUtc: f.kickoffUtc,
    home: f.home,
    opponent: teamById[f.opponentId],
  }));
  return <Simulator fixtures={fixtures} baseline={baselineScenario} siteUrl={SITE_URL} siteName={SITE_NAME} />;
}

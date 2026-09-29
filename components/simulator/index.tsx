import { Simulator } from "@/components/simulator/Simulator";
import { baselineScenario, FORTALEZA, focusFixtures, race, remainingMatchIds, teamById, timeline } from "@/lib/data";
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
  // confrontos diretos da corrida sem o Leão (os do Leão já estão na lista principal)
  const rivalFixtures = race.headToHead
    .filter((h) => h.homeId !== FORTALEZA && h.awayId !== FORTALEZA && remainingMatchIds.has(h.matchId))
    .map((h) => ({
      matchId: h.matchId,
      round: h.round,
      kickoffUtc: h.kickoffUtc,
      home: teamById[h.homeId],
      away: teamById[h.awayId],
    }));
  // jogos do Leão já disputados: placar do "Desafio do Leão"
  const played = timeline.points
    .filter((p) => p.result && p.opponentId && p.kickoffUtc)
    .map((p) => ({
      round: p.round,
      kickoffUtc: p.kickoffUtc!,
      home: !!p.home,
      opponent: teamById[p.opponentId!],
      result: p.result!,
    }));
  return (
    <Simulator
      fixtures={fixtures}
      baseline={baselineScenario}
      siteUrl={SITE_URL}
      siteName={SITE_NAME}
      rivalFixtures={rivalFixtures}
      played={played}
    />
  );
}

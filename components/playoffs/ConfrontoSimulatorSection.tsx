import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { ConfrontoSimulator, type SimLeg } from "@/components/playoffs/ConfrontoSimulator";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA, teamById } from "@/lib/data";
import { focus, focusTie } from "@/lib/playoffs";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Monta no servidor os dois jogos do confronto (com o placar real dos já disputados) para o simulador. */
export function ConfrontoSimulatorSection() {
  if (!focus || !focusTie || focusTie.legs.length < 2) return null;
  const legs: SimLeg[] = focusTie.legs.map((l) => ({
    leg: l.leg,
    homeId: l.homeId,
    awayId: l.awayId,
    kickoffUtc: l.kickoffUtc,
    final:
      l.status === "finished" && l.homeGoals != null && l.awayGoals != null
        ? { home: l.homeGoals, away: l.awayGoals }
        : null,
  }));
  const ids = [FORTALEZA, focus.opponentId];
  const teams = Object.fromEntries(ids.map((id) => [id, { name: teamById[id].name, article: teamById[id].article ?? "o" }]));
  const crests = Object.fromEntries(ids.map((id) => [id, id === FORTALEZA ? escudoFortaleza.src : crestSrc(id)]));
  return (
    <ConfrontoSimulator
      legs={legs}
      better={focus.better}
      fortalezaId={FORTALEZA}
      teams={teams}
      crests={crests}
      siteUrl={SITE_URL}
      siteName={SITE_NAME}
    />
  );
}

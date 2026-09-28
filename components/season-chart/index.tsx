import { SeasonChart } from "@/components/season-chart/SeasonChart";
import { race, teamById, timeline } from "@/lib/data";

/** Montanha-russa com os dados reais; os rivais são os times da corrida (F3). */
export function SeasonChartSection() {
  const rivalIds = race.teams.map((t) => t.teamId).filter((id) => id !== timeline.teamId);
  return <SeasonChart timeline={timeline} teams={teamById} rivalIds={rivalIds} />;
}

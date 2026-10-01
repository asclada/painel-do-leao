import { SeasonChart } from "@/components/season-chart/SeasonChart";
import { teamById, timeline } from "@/lib/data";

/** Montanha-russa com os dados reais. */
export function SeasonChartSection() {
  return <SeasonChart timeline={timeline} teams={teamById} />;
}

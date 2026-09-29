import { fortalezaOdds, history, teamById, timeline } from "@/lib/data";
import { pctNumber } from "@/lib/format";
import type { TimelinePoint } from "@/lib/generated/outputs";

/** Placar do jogo do Fortaleza na ordem mandante x visitante: "Fortaleza 2 x 0 Athletic". */
export function scoreLine(p: TimelinePoint) {
  const opp = teamById[p.opponentId ?? ""]?.name ?? p.opponentId ?? "";
  return p.home
    ? `Fortaleza ${p.goalsFor} x ${p.goalsAgainst} ${opp}`
    : `${opp} ${p.goalsAgainst} x ${p.goalsFor} Fortaleza`;
}

/**
 * "A conta mudou": a chance antes da rodada do último jogo do Leão (retrato do backtest) x a chance de agora
 * (a mesma do topo). Muda sozinha a cada rodada, porque tudo vem do pipeline.
 */
export function chanceChange() {
  const game = timeline.points.findLast((p) => p.result != null);
  if (!game) return null;
  const live = history.at(-1);
  const before = history.filter((h) => h.round < game.round && h !== live).at(-1);
  if (!before) return null;
  const from = pctNumber(before.pPromotion);
  const to = pctNumber(fortalezaOdds.pPromotion);
  return { game, beforeRound: before.round, from, to, diff: to - from };
}

/** "subiu de 62% para 66%" / "caiu de..." / "ficou em 62%" (sem "pontos percentuais"). */
export function changeText({ from, to }: { from: number; to: number }) {
  if (to === from) return `ficou em ${to}%`;
  return `${to > from ? "subiu" : "caiu"} de ${from}% para ${to}%`;
}

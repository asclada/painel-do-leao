import { fortalezaOdds, history, teamById, timeline } from "@/lib/data";
import { pct1 } from "@/lib/format";
import type { TimelinePoint } from "@/lib/generated/outputs";

/** Placar do jogo do Fortaleza na ordem mandante x visitante: "Fortaleza 2 x 0 Athletic". */
export function scoreLine(p: TimelinePoint) {
  const opp = teamById[p.opponentId ?? ""]?.name ?? p.opponentId ?? "";
  return p.home
    ? `Fortaleza ${p.goalsFor} x ${p.goalsAgainst} ${opp}`
    : `${opp} ${p.goalsAgainst} x ${p.goalsFor} Fortaleza`;
}

export type Shift = { from: number; to: number };

/**
 * "A conta mudou": as duas chances do GE (acesso direto e ir aos playoffs) antes da rodada do último jogo do Leão
 * (retrato do backtest) x agora (as mesmas do topo). Muda sozinha a cada rodada, porque tudo vem do pipeline.
 */
export function chanceChange() {
  const game = timeline.points.findLast((p) => p.result != null);
  if (!game) return null;
  const live = history.at(-1);
  const before = history.filter((h) => h.round < game.round && h !== live).at(-1);
  if (!before) return null;
  return {
    game,
    beforeRound: before.round,
    direct: { from: before.pDirect, to: fortalezaOdds.pDirect } as Shift,
    playoffs: { from: before.pTop6, to: fortalezaOdds.pTop6 } as Shift,
  };
}

/**
 * Mudou menos de 1 ponto: "praticamente igual". O "antes" (backtest, 10 mil simulações) e o "agora" (20 mil) vêm de
 * simulações diferentes, com ±0,5 ponto de variação aleatória entre elas (medido em 01/10); abaixo de 1 ponto, "subiu"
 * ou "caiu" poderia ser só acaso.
 */
export const SAME_THRESHOLD = 0.01;
export const same = (s: Shift) => Math.abs(s.to - s.from) < SAME_THRESHOLD;

/** "subiu de 45,2% para 37,6%" / "caiu de..." / "ficou praticamente igual, em 37,6%" (sem "pontos percentuais"). */
export function changeText({ from, to }: Shift) {
  if (same({ from, to })) return `ficou praticamente igual, em ${pct1(to)}`;
  return `${to > from ? "subiu" : "caiu"} de ${pct1(from)} para ${pct1(to)}`;
}

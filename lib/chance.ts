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

/** Mudou menos de 0,1 ponto (aparece igual na tela, com uma casa decimal). */
export const same = (s: Shift) => pct1(s.from) === pct1(s.to);

/** "subiu de 45,2% para 37,6%" / "caiu de..." / "ficou em 37,6%" (sem "pontos percentuais"). */
export function changeText({ from, to }: Shift) {
  if (same({ from, to })) return `ficou em ${pct1(to)}`;
  return `${to > from ? "subiu" : "caiu"} de ${pct1(from)} para ${pct1(to)}`;
}

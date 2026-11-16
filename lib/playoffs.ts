// Playoffs (mata-mata de ida e volta) com os dados do pipeline (data/playoffs.json). As regras puras ficam em
// lib/playoff-rules.ts (reexportadas aqui), que o navegador pode importar sem levar os JSON junto.
import { FORTALEZA, playoffs, teamById } from "@/lib/data";
import { chanceLabel } from "@/lib/clinch";
import type { PlayoffLeg, PlayoffTie } from "@/lib/generated/outputs";

export * from "@/lib/playoff-rules";

export const focus = playoffs?.focus ?? null;
export const focusTie: PlayoffTie | null =
  playoffs?.ties.find((t) => t.betterId === FORTALEZA || t.worseId === FORTALEZA) ?? null;
export const otherTie: PlayoffTie | null = playoffs?.ties.find((t) => t !== focusTie) ?? null;

/** Chance de passar: 100% e 0% só com o confronto decidido (como o "garantido na matemática" do resto do site). */
export function advanceLabel(p: number, decided = playoffs?.state === "finished") {
  if (decided) return p >= 0.5 ? "100%" : "0%";
  return chanceLabel(p);
}

/** Gols do Leão e do adversário num jogo, na visão do Leão. */
export function legForFocus(leg: Pick<PlayoffLeg, "homeId" | "homeGoals" | "awayGoals">) {
  if (leg.homeGoals == null || leg.awayGoals == null) return null;
  return leg.homeId === FORTALEZA
    ? { f: leg.homeGoals, o: leg.awayGoals }
    : { f: leg.awayGoals, o: leg.homeGoals };
}

/** "Criciúma 1 x 2 Fortaleza", sempre na ordem do jogo. */
export function legScoreLine(leg: Pick<PlayoffLeg, "homeId" | "awayId" | "homeGoals" | "awayGoals">) {
  const h = teamById[leg.homeId]?.name ?? leg.homeId;
  const a = teamById[leg.awayId]?.name ?? leg.awayId;
  return `${h} ${leg.homeGoals} x ${leg.awayGoals} ${a}`;
}

/** A regra do confronto em uma frase, do ponto de vista do Leão. */
export function rulePhrase(better: boolean, opponentId: string) {
  const opp = teamById[opponentId];
  const art = opp?.article === "a" ? "A" : "O";
  return better
    ? "O Leão fez a melhor campanha: decide em casa, na volta, e passa se o placar somado dos dois jogos terminar empatado."
    : `${art} ${opp?.name ?? opponentId} fez a melhor campanha: decide em casa e passa com empate no placar somado. O Leão precisa somar mais gols.`;
}


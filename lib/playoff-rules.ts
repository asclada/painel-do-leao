// Regras do mata-mata em frases e contas puras (sem dados): rodam no servidor e no navegador (simulador do confronto).
// Regulamento (confirmado em 28/09): a melhor campanha faz a volta em casa e, com empate no placar somado, passa ela
// (sem pênaltis). Quem passa sobe para a Série A.
import { plural } from "@/lib/format";

export const LAST_REGULAR_ROUND = 38;
/** O palpite e os cards numeram a ida como "rodada 39" e a volta como "rodada 40" (só por dentro; na tela, "Ida"). */
export const FIRST_LEG_ROUND = 39;
export const SECOND_LEG_ROUND = 40;

export function legName(leg: number) {
  return leg === 1 ? "Jogo de ida" : "Jogo de volta";
}

/** "Rodada 31" nos pontos corridos; "Playoffs · ida" / "Playoffs · volta" no mata-mata. */
export function roundLabel(round: number) {
  if (round <= LAST_REGULAR_ROUND) return `Rodada ${round}`;
  return round === FIRST_LEG_ROUND ? "Playoffs · ida" : "Playoffs · volta";
}

/** Versão curta para listas: "R31", "Ida", "Volta". */
export function roundShort(round: number) {
  if (round <= LAST_REGULAR_ROUND) return `R${round}`;
  return round === FIRST_LEG_ROUND ? "Ida" : "Volta";
}

/**
 * Resultado do confronto com os placares dados (na visão do Leão): placar somado e se o Leão passa. Empate no placar
 * somado: passa a melhor campanha (`better`).
 */
export function tieOutcome(better: boolean, legs: { f: number; o: number }[]) {
  const f = legs.reduce((s, l) => s + l.f, 0);
  const o = legs.reduce((s, l) => s + l.o, 0);
  return { f, o, advances: f > o || (f === o && better), byTiebreak: f === o };
}

/** "Vencer por 2", "Empatar", "Perder por 3 ou mais" (as linhas do "Do que o Leão precisa"). */
export function marginLabel(m: number, cap = 3) {
  if (m === 0) return "Empatar";
  const n = Math.abs(m);
  const verb = m > 0 ? "Vencer" : "Perder";
  return `${verb} por ${n}${n >= cap ? " ou mais" : ""}`;
}

/**
 * Do que o Leão precisa no jogo que falta, dado o saldo até aqui (gols do Leão menos os do adversário).
 * `capped`: a linha junta "3 ou mais" (a frase fala da diferença em vez de um número).
 */
export function needPhrase(marginSoFar: number, better: boolean, capped = false) {
  if (capped) {
    if (marginSoFar > 0) return better ? "pode perder até pela mesma diferença" : "pode perder por menos que a diferença";
    return better ? "precisa vencer pela mesma diferença" : "precisa vencer por mais que a diferença";
  }
  const t = -marginSoFar + (better ? 0 : 1); // saldo mínimo que falta
  if (t <= -1) return `pode perder por até ${plural(-t, "gol")}`;
  if (t === 0) return "o empate basta";
  if (t === 1) return "precisa vencer";
  return `precisa vencer por ${t} gols ou mais`;
}

// ---------------------------------------------------------------- simulador do confronto (?c=)

/** Placar de um jogo do confronto na ordem do jogo (mandante x visitante). */
export type LegScore = { home: number; away: number };
export const CONFRONTO_PARAM = "c";
const LEG_RE = /^(\d)-(\d)$/;

/** "1-2_1-1" (ida_volta, na ordem de cada jogo) -> placares; jogo sem placar válido = null. */
export function decodeConfronto(raw: string | null | undefined): (LegScore | null)[] {
  const parts = (raw ?? "").split("_");
  return [0, 1].map((i) => {
    const m = LEG_RE.exec((parts[i] ?? "").trim());
    return m ? { home: Number(m[1]), away: Number(m[2]) } : null;
  });
}

export function encodeConfronto(legs: (LegScore | null)[]) {
  return legs.map((l) => (l ? `${l.home}-${l.away}` : "")).join("_");
}

// "Desafio do Leão": a previsão completa + apelido vão no link; o amigo faz a dele e os dois aparecem lado a lado.
// Tudo na URL (sem banco): ?a=Lucas&ap=31VVEDVVEE (desafiante) e, no duelo, &b=João&bp=31VEEDVVVD.
//
// A previsão é guardada POR RODADA ("31" + um resultado por rodada até a 38), e não por posição na lista de
// jogos: o Leão joga uma vez por rodada, então o link continua valendo depois que os jogos acontecem, e dá para
// contar quem acertou mais.
import type { Choice } from "@/lib/simulator-client";

export type Pick = "V" | "E" | "D";
export type Picks = { start: number; picks: Pick[] };
export type Player = { name: string; picks: Picks };
export type Challenge = { a: Player; b: Player | null };

export const LAST_ROUND = 38;
export const NAME_MAX = 20;

/** "31VVEDVVEE": a rodada do primeiro jogo e um resultado por rodada até a 38. */
export function encodePicks(start: number, choices: Choice[]) {
  return `${start}${choices.join("")}`;
}

export function decodePicks(raw: string | null | undefined): Picks | null {
  const m = /^(\d{1,2})([VED]+)$/.exec((raw ?? "").toUpperCase());
  if (!m) return null;
  const start = Number(m[1]);
  const picks = m[2].split("") as Pick[];
  if (start < 1 || start + picks.length - 1 !== LAST_ROUND) return null;
  return { start, picks };
}

/** Apelido: letras (com acento), números, espaço, ponto, hífen e apóstrofo; até 20 caracteres. */
export function cleanName(raw: string | null | undefined): string | null {
  const name = (raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return name.length > 0 ? name : null;
}

export function pickFor(p: Picks, round: number): Pick | null {
  const i = round - p.start;
  return i >= 0 && i < p.picks.length ? p.picks[i] : null;
}

/** Escolhas para os jogos que ainda faltam (na ordem do simulador), a partir da previsão por rodada. */
export function choicesFor(p: Picks, rounds: number[]): Choice[] {
  return rounds.map((r) => pickFor(p, r) ?? "-");
}

export function parseChallenge(params: URLSearchParams): Challenge | null {
  const aName = cleanName(params.get("a"));
  const aPicks = decodePicks(params.get("ap"));
  if (!aName || !aPicks) return null;
  const bName = cleanName(params.get("b"));
  const bPicks = decodePicks(params.get("bp"));
  return { a: { name: aName, picks: aPicks }, b: bName && bPicks ? { name: bName, picks: bPicks } : null };
}

export function challengeUrl(siteUrl: string, a: Player, b?: Player | null) {
  const q = new URLSearchParams({ a: a.name, ap: `${a.picks.start}${a.picks.picks.join("")}` });
  if (b) {
    q.set("b", b.name);
    q.set("bp", `${b.picks.start}${b.picks.picks.join("")}`);
  }
  return `${siteUrl}/?${q.toString()}#simulador`;
}

export type PlayedGame = { round: number; result: Pick };

/**
 * Placar do duelo: acertos de cada um nos jogos já disputados que os DOIS previram antes de acontecer
 * (a partir da rodada em que o último dos dois fez a previsão).
 */
export function duelScore(a: Picks, b: Picks, played: PlayedGame[]) {
  const from = Math.max(a.start, b.start);
  const counted = played.filter((g) => g.round >= from).sort((x, y) => x.round - y.round);
  return {
    from,
    counted: counted.length,
    a: counted.filter((g) => pickFor(a, g.round) === g.result).length,
    b: counted.filter((g) => pickFor(b, g.round) === g.result).length,
  };
}

/** Pontos finais de uma previsão: os pontos de agora + os dos jogos que faltam (os já disputados já contam). */
export function finalPointsFor(p: Picks, currentPoints: number, remainingRounds: number[]) {
  return remainingRounds.reduce((sum, r) => {
    const c = pickFor(p, r);
    return sum + (c === "V" ? 3 : c === "E" ? 1 : 0);
  }, currentPoints);
}

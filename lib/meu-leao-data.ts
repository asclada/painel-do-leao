// Opções do cartão "Meu Leão" geradas dos JSON do pipeline (nada escrito à mão por rodada): as vitórias mais
// marcantes da temporada e onde o Leão termina, com a chance de cada final pelo modelo.
import matchesJson from "@/data/matches.json";
import { fortalezaOdds, standings, teamById, timeline } from "@/lib/data";
import type { FinishOption, GameOption } from "@/lib/meu-leao";

type MatchRow = { id: string; homeId: string; htHomeGoals: number | null; htAwayGoals: number | null };
const matches = matchesJson as MatchRow[];

type Win = { matchId: string; round: number; home: boolean; opponentId: string; gf: number; ga: number };

const wins: Win[] = timeline.points
  .filter((p) => p.result === "V" && p.matchId && p.opponentId && p.goalsFor != null && p.goalsAgainst != null)
  .map((p) => ({
    matchId: p.matchId!,
    round: p.round,
    home: !!p.home,
    opponentId: p.opponentId!,
    gf: p.goalsFor!,
    ga: p.goalsAgainst!,
  }));

function line(w: Win) {
  const opp = teamById[w.opponentId].name;
  return w.home ? `Fortaleza ${w.gf} x ${w.ga} ${opp}` : `${opp} ${w.ga} x ${w.gf} Fortaleza`;
}

/** Perdia no intervalo e virou. */
function isComeback(w: Win) {
  const m = matches.find((x) => x.id === w.matchId);
  if (!m || m.htHomeGoals == null || m.htAwayGoals == null) return false;
  const [f, o] = w.home ? [m.htHomeGoals, m.htAwayGoals] : [m.htAwayGoals, m.htHomeGoals];
  return f < o;
}

const position = (teamId: string) => standings.find((r) => r.teamId === teamId)?.position ?? 99;
const biggest = (a: Win, b: Win) => b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.round - a.round;

/** Até 4 vitórias marcantes: a maior goleada, a virada mais recente, a vitória sobre o mais bem colocado e a última. */
export function gameOptions(): GameOption[] {
  const picked: GameOption[] = [];
  const add = (w: Win | undefined, tag: string) => {
    if (w && !picked.some((p) => p.matchId === w.matchId)) picked.push({ matchId: w.matchId, round: w.round, line: line(w), tag });
  };
  add([...wins].sort(biggest)[0], "a maior vitória");
  add([...wins].reverse().find(isComeback), "virada depois do intervalo");
  const best = [...wins].sort((a, b) => position(a.opponentId) - position(b.opponentId) || b.round - a.round)[0];
  if (best) add(best, `contra o ${position(best.opponentId)}º colocado de hoje`);
  add(wins.at(-1), "a vitória mais recente");
  for (const w of [...wins].sort(biggest)) if (picked.length < 4) add(w, "vitória marcante");
  return picked.slice(0, 4).sort((a, b) => a.round - b.round);
}

/** Qualquer vitória do Leão na temporada (o link do card continua valendo quando a lista de opções muda). */
export function winById(matchId: string): GameOption | null {
  const w = wins.find((x) => x.matchId === matchId);
  if (!w) return null;
  return gameOptions().find((o) => o.matchId === matchId) ?? { matchId, round: w.round, line: line(w), tag: "" };
}

/**
 * Onde o Leão termina nos pontos corridos: campeão, 2º, playoffs (3º a 6º) ou fora do G6 (as chances somam 100%).
 * Mesmas perguntas do GE (decisão do Lucas, 30/09): nada de "sobe pelos playoffs", que junta o mata-mata.
 */
export function finishOptions(): FinishOption[] {
  const o = fortalezaOdds;
  return [
    { label: "Campeão da Série B", chance: o.pTitle },
    { label: "Sobe direto, em 2º", chance: Math.max(0, o.pDirect - o.pTitle) },
    { label: "Nos playoffs (3º a 6º)", chance: o.pTop6 },
    { label: "Fora do G6", chance: Math.max(0, 1 - o.pDirect - o.pTop6) },
  ];
}

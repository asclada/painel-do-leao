// Dados do "Palpite da rodada" montados no servidor (build/rotas de card), a partir dos JSON do pipeline:
// placares (timeline), chances V/E/D do Leão antes de cada rodada (backtest, a mesma previsão da calibração) e
// quantos rivais de cima tropeçaram na rodada (matches). Só o resultado, pequeno, vai para o navegador.
import backtestJson from "@/data/backtest.json";
import matchesJson from "@/data/matches.json";
import { FORTALEZA, nextMatch, timeline } from "@/lib/data";
import { LAST_ROUND, type GameChances, type PalpiteGame } from "@/lib/palpite";

/** O palpite começou a valer na rodada 31 (30/09/2026); antes disso não há o que conferir. */
export const FIRST_PALPITE_ROUND = 31;
/** Rivais = os outros times entre os 8 primeiros antes da rodada. */
const RIVALS_TOP = 8;

type BacktestRound = {
  round: number;
  nextMatches: { matchId: string; pHome: number; pDraw: number; pAway: number }[];
  teams: Record<string, { position: number }>;
};
type MatchRow = {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
};

const backtest = (backtestJson as { rounds: BacktestRound[] }).rounds;
const matches = matchesJson as MatchRow[];

/** Chances do Leão no jogo pela previsão feita depois da rodada anterior (backtest); senão, a do próximo jogo. */
function chancesFor(matchId: string, round: number, home: boolean): GameChances | null {
  const before = [...backtest].reverse().find((b) => b.round < round && b.nextMatches.some((m) => m.matchId === matchId));
  const m = before?.nextMatches.find((x) => x.matchId === matchId);
  if (m) return home ? { win: m.pHome, draw: m.pDraw, loss: m.pAway } : { win: m.pAway, draw: m.pDraw, loss: m.pHome };
  if (nextMatch?.matchId === matchId && nextMatch.chances) return nextMatch.chances;
  return null;
}

/** Quantos rivais de cima não venceram na rodada (só quando todos eles já jogaram). */
function rivalsFor(round: number): PalpiteGame["rivals"] {
  const before = backtest.find((b) => b.round === round - 1);
  if (!before) return null;
  const rivals = Object.entries(before.teams)
    .filter(([id, t]) => id !== FORTALEZA && t.position <= RIVALS_TOP)
    .map(([id]) => id);
  let stumbled = 0;
  for (const id of rivals) {
    const m = matches.find((x) => x.round === round && (x.homeId === id || x.awayId === id));
    if (!m || m.status !== "finished" || m.homeGoals === null || m.awayGoals === null) return null;
    const [gf, ga] = m.homeId === id ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
    if (gf <= ga) stumbled += 1;
  }
  return { stumbled, total: rivals.length };
}

function buildGames(): PalpiteGame[] {
  const games: PalpiteGame[] = [];
  for (const p of timeline.points) {
    if (p.round < FIRST_PALPITE_ROUND || !p.result || !p.matchId || !p.opponentId || !p.kickoffUtc) continue;
    if (p.goalsFor == null || p.goalsAgainst == null) continue;
    const home = !!p.home;
    games.push({
      round: p.round,
      matchId: p.matchId,
      kickoffUtc: p.kickoffUtc,
      home,
      opponentId: p.opponentId,
      score: home ? { home: p.goalsFor, away: p.goalsAgainst } : { home: p.goalsAgainst, away: p.goalsFor },
      chances: chancesFor(p.matchId, p.round, home),
      rivals: rivalsFor(p.round),
    });
  }
  const next = nextMatch;
  if (next && next.round <= LAST_ROUND && !games.some((g) => g.round === next.round)) {
    games.push({
      round: next.round,
      matchId: next.matchId,
      kickoffUtc: next.kickoffUtc,
      home: next.home,
      opponentId: next.opponentId,
      score: null,
      chances: chancesFor(next.matchId, next.round, next.home),
      rivals: null,
    });
  }
  return games.sort((a, b) => a.round - b.round);
}

/** Jogos com palpite: os já disputados desde a rodada 31 e o próximo jogo do Leão (o único aberto). */
export const palpiteGames: PalpiteGame[] = buildGames();

/** O jogo aberto para palpite agora (o próximo do Leão nos pontos corridos). */
export const openGame: PalpiteGame | null =
  palpiteGames.find((g) => g.round === nextMatch?.round && g.score === null) ?? null;

// "Palpite da rodada": o torcedor crava o placar do próximo jogo do Leão (resultado certo = 2 pontos, placar exato
// = 5). Sem banco e sem login: os palpites ficam no aparelho (localStorage) e num link de backup. A conferência é
// feita no navegador, com os placares que o pipeline já publica. Este arquivo é puro (roda no servidor e no cliente).

export type Outcome = "V" | "E" | "D";

/** Um palpite: gols do mandante x visitante (na ordem do jogo) e quando foi feito (segundos desde 1970). */
export type Guess = { round: number; home: number; away: number; at: number };

/** Chances do Leão no jogo (V/E/D), pela previsão do modelo antes da rodada. */
export type GameChances = { win: number; draw: number; loss: number };

/** Um jogo do Leão que pode ter palpite (o próximo) ou que já teve (os disputados desde que o palpite existe). */
export type PalpiteGame = {
  round: number;
  matchId: string;
  kickoffUtc: string;
  /** o Leão é o mandante? */
  home: boolean;
  opponentId: string;
  /** placar final na ordem do jogo (mandante x visitante); null enquanto não acabou */
  score: { home: number; away: number } | null;
  chances: GameChances | null;
  /** rivais de cima da tabela que tropeçaram (não venceram) na rodada, quando todos já jogaram */
  rivals: { stumbled: number; total: number } | null;
};

export const PTS_EXACT = 5;
export const PTS_RESULT = 2;
export const GOALS_MAX = 9;
export const LAST_ROUND = 38;
export const STORAGE_KEY = "fen:palpites";

// ---------------------------------------------------------------- pontos

/** Resultado do jogo na visão do Leão. */
export function outcomeFor(home: boolean, h: number, a: number): Outcome {
  const [f, o] = home ? [h, a] : [a, h];
  return f > o ? "V" : f < o ? "D" : "E";
}

/** Vale só o palpite feito antes de a bola rolar. */
export function isOnTime(guess: Guess, game: PalpiteGame) {
  return guess.at * 1000 < Date.parse(game.kickoffUtc);
}

export type Verdict = { points: number; exact: boolean; result: boolean };

/** Pontos de um palpite num jogo encerrado (null se o jogo ainda não acabou ou o palpite chegou atrasado). */
export function scoreGuess(guess: Guess, game: PalpiteGame): Verdict | null {
  if (!game.score || !isOnTime(guess, game)) return null;
  const exact = guess.home === game.score.home && guess.away === game.score.away;
  const result =
    outcomeFor(game.home, guess.home, guess.away) === outcomeFor(game.home, game.score.home, game.score.away);
  return { points: exact ? PTS_EXACT : result ? PTS_RESULT : 0, exact, result };
}

export type Scored = { guess: Guess; game: PalpiteGame; verdict: Verdict | null };

/** Os palpites com o jogo de cada um e os pontos (em ordem de rodada). Palpites sem jogo conhecido ficam de fora. */
export function scoreAll(guesses: Guess[], games: PalpiteGame[]): Scored[] {
  const byRound = new Map(games.map((g) => [g.round, g]));
  return guesses
    .map((guess) => {
      const game = byRound.get(guess.round);
      return game ? { guess, game, verdict: scoreGuess(guess, game) } : null;
    })
    .filter((s): s is Scored => s !== null)
    .sort((x, y) => x.guess.round - y.guess.round);
}

export function totalPoints(scored: Scored[]) {
  return scored.reduce((sum, s) => sum + (s.verdict?.points ?? 0), 0);
}

// ---------------------------------------------------------------- conquistas (regras automáticas)

export type Achievement = { id: string; title: string; rule: string };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "estreia", title: "Pé na arquibancada", rule: "Deu o primeiro palpite." },
  { id: "pe-quente", title: "Pé-quente", rule: "Acertou o resultado de um jogo do Leão." },
  { id: "olho-de-lince", title: "Olho de lince", rule: "Cravou o placar exato." },
  {
    id: "professor-pardal",
    title: "Professor Pardal",
    rule: "Acertou o resultado que o modelo dava como o menos provável.",
  },
  { id: "fe-inabalavel", title: "Fé inabalável", rule: "Cravou vitória do Leão num jogo em que o modelo não o via como favorito." },
  {
    id: "secador",
    title: "Secador profissional",
    rule: "Palpitou numa rodada em que 5 ou mais rivais de cima tropeçaram.",
  },
  { id: "carteirinha", title: "Sócio de carteirinha", rule: "Deu palpite em 3 rodadas seguidas." },
  { id: "vidente", title: "Vidente", rule: "Acertou o resultado em 3 palpites seguidos." },
  { id: "ate-o-fim", title: "Até o fim", rule: "Deu palpite na última rodada." },
];

export const SECADOR_MIN = 5;

function outcomeChance(c: GameChances, o: Outcome) {
  return o === "V" ? c.win : o === "E" ? c.draw : c.loss;
}

/** Ids das conquistas liberadas, calculadas só com os palpites e os dados do pipeline. */
export function unlockedAchievements(scored: Scored[]): Set<string> {
  const got = new Set<string>();
  const valid = scored.filter((s) => isOnTime(s.guess, s.game));
  if (valid.length > 0) got.add("estreia");

  for (const { guess, game, verdict } of valid) {
    const mine = outcomeFor(game.home, guess.home, guess.away);
    if (verdict?.result) got.add("pe-quente");
    if (verdict?.exact) got.add("olho-de-lince");
    if (verdict?.result && game.chances) {
      const p = outcomeChance(game.chances, mine);
      if (p <= Math.min(game.chances.win, game.chances.draw, game.chances.loss)) got.add("professor-pardal");
    }
    if (mine === "V" && game.chances && game.chances.win < Math.max(game.chances.draw, game.chances.loss)) {
      got.add("fe-inabalavel");
    }
    if (game.rivals && game.rivals.stumbled >= SECADOR_MIN) got.add("secador");
    if (guess.round === LAST_ROUND) got.add("ate-o-fim");
  }

  // sequências por rodada (3 seguidas)
  const rounds = valid.map((s) => s.guess.round);
  const hits = valid.filter((s) => s.verdict?.result).map((s) => s.guess.round);
  if (hasRun(rounds, 3)) got.add("carteirinha");
  if (hasRun(hits, 3)) got.add("vidente");
  return got;
}

function hasRun(rounds: number[], len: number) {
  const set = new Set(rounds);
  return rounds.some((r) => Array.from({ length: len }, (_, i) => set.has(r + i)).every(Boolean));
}

// ---------------------------------------------------------------- link de backup

// Formato: "31-2-1-lx8k2q_32-0-0-lx9a1b" → rodada, gols do mandante, gols do visitante e o momento do palpite
// (segundos, base 36). Só letras, números, "-" e "_": não precisa de escape na URL.
export const BACKUP_PARAM = "palpites";

export function encodeGuesses(guesses: Guess[]) {
  return [...guesses]
    .sort((a, b) => a.round - b.round)
    .map((g) => `${g.round}-${g.home}-${g.away}-${g.at.toString(36)}`)
    .join("_");
}

export function decodeGuesses(raw: string | null | undefined): Guess[] {
  const out = new Map<number, Guess>();
  for (const part of (raw ?? "").split("_")) {
    const m = /^(\d{1,2})-(\d)-(\d)-([0-9a-z]{1,10})$/.exec(part.trim().toLowerCase());
    if (!m) continue;
    const round = Number(m[1]);
    const at = parseInt(m[4], 36);
    if (round < 1 || round > LAST_ROUND || !Number.isFinite(at)) continue;
    out.set(round, { round, home: Number(m[2]), away: Number(m[3]), at });
  }
  return [...out.values()].sort((a, b) => a.round - b.round);
}

/** Junta os palpites do link com os do aparelho; na mesma rodada vale o do link (o torcedor pediu para restaurar). */
export function mergeGuesses(local: Guess[], fromLink: Guess[]) {
  const map = new Map(local.map((g) => [g.round, g]));
  for (const g of fromLink) map.set(g.round, g);
  return [...map.values()].sort((a, b) => a.round - b.round);
}

export function backupUrl(siteUrl: string, guesses: Guess[]) {
  return `${siteUrl}/?${BACKUP_PARAM}=${encodeGuesses(guesses)}#palpite`;
}

// ---------------------------------------------------------------- textos

/** "Fortaleza 2 x 1 Náutico" (sempre na ordem do jogo). */
export function scoreText(homeName: string, awayName: string, h: number, a: number) {
  return `${homeName} ${h} x ${a} ${awayName}`;
}

export function verdictText(v: Verdict) {
  if (v.exact) return `Placar exato! +${PTS_EXACT} pontos`;
  if (v.result) return `Acertou o resultado: +${PTS_RESULT} pontos`;
  return "Dessa vez não deu: nenhum ponto";
}

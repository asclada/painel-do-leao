// Cartão "Meu Leão": 4 respostas com opções prontas (sem texto livre) viram um story. As opções fixas ficam aqui
// (roda no servidor e no cliente); as que vêm dos dados (jogos marcantes, chances do modelo) em meu-leao-data.ts.

export const WHERE_OPTIONS = ["No Castelão", "No bar com a galera", "Em casa, no sofá", "No celular, onde eu estiver"] as const;

export const PHRASE_OPTIONS = [
  "Eu acredito!",
  "Sofrer faz parte. Desistir, nunca.",
  "Série A, me aguarde.",
  "Onde o Leão for, eu vou.",
  "Tricolor até o fim.",
] as const;

/** Um jogo marcante da temporada (vitória do Leão), com o motivo de estar na lista. */
export type GameOption = { matchId: string; round: number; line: string; tag: string };

/** Onde o Leão termina: opções que não se sobrepõem (somam 100%), cada uma com a chance do modelo. */
export type FinishOption = { label: string; chance: number };

export type MeuLeaoAnswers = { where: number; game: string; finish: number; phrase: number };

export function cardQuery(a: MeuLeaoAnswers, name: string | null, palpite: { points: number; achievements: number } | null) {
  const q = new URLSearchParams({ v: String(a.where), j: a.game, f: String(a.finish), s: String(a.phrase) });
  if (name) q.set("n", name);
  if (palpite) {
    q.set("pp", String(palpite.points));
    q.set("cq", String(palpite.achievements));
  }
  return q.toString();
}

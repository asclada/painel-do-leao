// Curiosidades do Raio-X como cards para compartilhar: a frase de destaque do pipeline (data/xray.json →
// insights) + um número grande. Tudo muda sozinho a cada rodada; nada é escrito à mão.
import { meta, xray } from "@/lib/data";
import { plural } from "@/lib/format";

export type CuriosityId = "venue" | "halves" | "goalBins" | "turns" | "streaks";
export type Curiosity = { id: CuriosityId; title: string; big: string; bigLabel: string; text: string };

const fmt1 = (x: number) => x.toFixed(1).replace(".", ",");
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function curiosities(): Curiosity[] {
  const { home, away, halves, goalBins, firstTurn, secondTurn, streaks, insights } = xray;
  const out: Curiosity[] = [];

  out.push({
    id: "venue",
    title: "Castelão x fora de casa",
    big: `${home.pct}%`,
    bigLabel: `dos pontos no Castelão (fora: ${away.pct}%)`,
    text: insights.venue,
  });

  if (halves && insights.halves) {
    const swing = halves.pointsSwing ?? 0;
    out.push(
      swing !== 0
        ? {
            id: "halves",
            title: "Depois do intervalo",
            big: signed(swing),
            bigLabel: `${Math.abs(swing) === 1 ? "ponto" : "pontos"} ${swing > 0 ? "a mais" : "a menos"} do que se os jogos acabassem no intervalo`,
            text: insights.halves,
          }
        : {
            id: "halves",
            title: "1º tempo x 2º tempo",
            big: signed(halves.secondFor - halves.secondAgainst),
            bigLabel: "de saldo no 2º tempo",
            text: insights.halves,
          },
    );
  }

  if (meta.hasGoalMinutes && goalBins && insights.goalBins) {
    const best = goalBins.reduce((a, b) => (b.goalsFor > a.goalsFor ? b : a));
    const [lo, hi] = best.label.split("–"); // "76–90+"
    out.push({
      id: "goalBins",
      title: "Gols por faixa de minutos",
      big: String(best.goalsFor),
      bigLabel: `${best.goalsFor === 1 ? "gol" : "gols"} entre os minutos ${lo} e ${hi ?? ""}`.trim(),
      text: insights.goalBins,
    });
  }

  out.push({
    id: "turns",
    title: "1º turno x returno",
    big: fmt1(secondTurn.played ? secondTurn.ppg : firstTurn.ppg),
    bigLabel: secondTurn.played ? "pontos por jogo no returno" : "pontos por jogo no 1º turno",
    text: insights.turns,
  });

  const current = streaks.currentKind === "unbeaten" || streaks.currentKind === "wins";
  out.push({
    id: "streaks",
    title: "Sequências",
    big: String(current ? streaks.currentCount : streaks.longestUnbeaten),
    bigLabel: current
      ? streaks.currentKind === "wins"
        ? "vitórias seguidas"
        : "jogos sem perder"
      : `jogos: a maior série invicta do ano (${plural(streaks.cleanSheets, "jogo")} sem sofrer gol)`,
    text: insights.streaks,
  });

  return out;
}

export function curiosity(id: string | null | undefined): Curiosity | null {
  return curiosities().find((c) => c.id === id) ?? null;
}

/** A curiosidade da vez no "Conteúdo da rodada": muda sozinha a cada rodada (roda a lista). */
export function curiosityOfTheRound(): Curiosity {
  const list = curiosities();
  return list[meta.lastCompletedRound % list.length];
}

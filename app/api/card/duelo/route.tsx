import { ImageResponse } from "next/og";
import { choicesFor, duelScore, finalPointsFor, parseChallenge, pickFor, type Pick } from "@/lib/challenge";
import { focusFixtures, simulation, teamById, timeline } from "@/lib/data";
import { DuelCard, type DuelRow, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";
import { simulate } from "@/lib/og/simulate";
import { isComplete, serializeChoices } from "@/lib/simulator-client";

/**
 * Card de story do "Desafio do Leão" (1080×1920): /api/card/duelo?a=Lucas&ap=31VVED...&b=João&bp=31VEED...
 * As duas previsões por rodada, o resultado real dos jogos já disputados, o placar de acertos, os pontos finais e
 * as chances de acesso direto e de ir aos playoffs de cada previsão. Tudo vem do link (sem banco).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ch = parseChallenge(url.searchParams);
  if (!ch?.b) return new Response("Link de duelo incompleto.", { status: 400 });
  const { a, b } = ch;

  const played = timeline.points
    .filter((p) => p.result && p.opponentId)
    .map((p) => ({ round: p.round, result: p.result as Pick, opponentId: p.opponentId!, home: !!p.home }));
  // só as rodadas que os dois previram (as mesmas do placar)
  const from = Math.max(a.picks.start, b.picks.start);
  const rows: DuelRow[] = [
    ...played.filter((g) => g.round >= from).map((g) => ({ ...g, result: g.result as Pick | null })),
    ...focusFixtures.map((f) => ({ round: f.round, opponentId: f.opponentId, home: f.home, result: null })),
  ]
    .sort((x, y) => x.round - y.round)
    .map((r) => ({
      round: r.round,
      opponent: teamById[r.opponentId],
      home: r.home,
      a: pickFor(a.picks, r.round),
      b: pickFor(b.picks, r.round),
      result: r.result,
    }));

  const rounds = focusFixtures.map((f) => f.round);
  const current = simulation.magic.currentPoints;
  const score = duelScore(a.picks, b.picks, played);
  const pa = choicesFor(a.picks, rounds);
  const pb = choicesFor(b.picks, rounds);
  let chances: [{ direct: number; playoffs: number }, { direct: number; playoffs: number }] | null = null;
  if (isComplete(pa) && isComplete(pb)) {
    const [ra, rb] = await Promise.all([
      simulate(url.origin, serializeChoices(pa)),
      simulate(url.origin, serializeChoices(pb)),
    ]);
    if (ra && rb)
      chances = [
        { direct: ra.focus.pDirect, playoffs: ra.focus.pTop6 },
        { direct: rb.focus.pDirect, playoffs: rb.focus.pTop6 },
      ];
  }

  return new ImageResponse(
    (
      <DuelCard
        aName={a.name}
        bName={b.name}
        rows={rows}
        score={score}
        points={[finalPointsFor(a.picks, current, rounds), finalPointsFor(b.picks, current, rounds)]}
        chances={chances}
      />
    ),
    {
      ...STORY,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    },
  );
}

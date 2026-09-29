import { ImageResponse } from "next/og";
import { FORTALEZA, nextMatch } from "@/lib/data";
import { NextMatchStoryCard, STORY } from "@/lib/og/cards";
import { crestDataUrl } from "@/lib/og/crests";
import { ogFonts } from "@/lib/og/fonts";

/** Card de story do próximo jogo do Leão (1080×1920), com os escudos e as chances de vitória, empate e derrota. */
export async function GET() {
  if (!nextMatch) return new Response("Não há próximo jogo.", { status: 404 });
  const homeId = nextMatch.home ? FORTALEZA : nextMatch.opponentId;
  const awayId = nextMatch.home ? nextMatch.opponentId : FORTALEZA;
  const [home, away] = await Promise.all([crestDataUrl(homeId), crestDataUrl(awayId)]);
  return new ImageResponse(<NextMatchStoryCard match={nextMatch} crests={{ home, away }} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

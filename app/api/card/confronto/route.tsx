import { ImageResponse } from "next/og";
import { focusTie } from "@/lib/playoffs";
import { ConfrontoCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";
import { CONFRONTO_PARAM, decodeConfronto } from "@/lib/playoff-rules";

/**
 * Card de story do simulador do confronto (1080×1920): /api/card/confronto?c=1-2_1-1 (ida e volta, na ordem de cada
 * jogo). Jogo já disputado sai sempre com o placar real.
 */
export async function GET(req: Request) {
  const legs = decodeConfronto(new URL(req.url).searchParams.get(CONFRONTO_PARAM));
  if (!focusTie || focusTie.legs.length < 2) return new Response("Não há confronto.", { status: 404 });
  const scores = focusTie.legs.map((l, i) =>
    l.status === "finished" && l.homeGoals != null && l.awayGoals != null
      ? { home: l.homeGoals, away: l.awayGoals }
      : legs[i],
  );
  if (scores.some((s) => s === null)) return new Response("Escolha o placar dos dois jogos.", { status: 400 });
  return new ImageResponse(<ConfrontoCard legs={scores as { home: number; away: number }[]} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

import { ImageResponse } from "next/og";
import { curiosity } from "@/lib/curiosities";
import { CuriosityCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

/** Card de story de uma curiosidade do Raio-X: /api/card/curiosidade?t=venue|halves|goalBins|turns|streaks */
export async function GET(req: Request) {
  const c = curiosity(new URL(req.url).searchParams.get("t"));
  if (!c) return new Response("Curiosidade desconhecida.", { status: 404 });
  return new ImageResponse(<CuriosityCard c={c} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

import { ImageResponse } from "next/og";
import { focusFixtures } from "@/lib/data";
import { ProvocationCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";
import { simulate } from "@/lib/og/simulate";
import { isComplete, parseChoices, serializeChoices } from "@/lib/simulator-client";

/**
 * Card de story "Modelo x eu" (1080×1920) para /api/card/provocacao?p=VVEDVVEE[&x=...]: a chance de agora contra a
 * chance da previsão do torcedor. Como o card "Minha previsão", exige V, E ou D em todos os jogos.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("p") ?? "").toUpperCase();
  const choices = parseChoices(raw, focusFixtures.length);
  const p = serializeChoices(choices);
  if (raw !== p || !isComplete(choices)) {
    return new Response(`Escolha V, E ou D para cada um dos ${focusFixtures.length} jogos que faltam.`, { status: 400 });
  }
  const result = await simulate(url.origin, p, url.searchParams.get("x"));
  if (!result) return new Response("Não deu para simular agora.", { status: 503 });

  return new ImageResponse(<ProvocationCard result={result} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

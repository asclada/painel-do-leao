import { ImageResponse } from "next/og";
import { focusFixtures } from "@/lib/data";
import type { ScenarioResult } from "@/lib/generated/scenario";
import { PredictionCard, predictionGames, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";
import { isComplete, parseChoices, serializeChoices } from "@/lib/simulator-client";

/**
 * F6 — card de story "Minha previsão" (1080×1920) para /api/card/previsao?p=VVEDVVEE.
 * Como no simulador, exige V, E ou D em todos os jogos que faltam (sem sorteio).
 * Os números vêm da mesma API do simulador (/api/py/simular), que normalmente já está no cache da CDN.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("p") ?? "").toUpperCase();
  const choices = parseChoices(raw, focusFixtures.length);
  const p = serializeChoices(choices);
  if (raw !== p || !isComplete(choices)) {
    return new Response(`Escolha V, E ou D para cada um dos ${focusFixtures.length} jogos que faltam.`, { status: 400 });
  }

  const res = await fetch(new URL(`/api/py/simular?p=${p}`, url.origin), { signal: AbortSignal.timeout(15_000) }).catch(
    () => null,
  );
  if (!res?.ok) return new Response("Não deu para simular agora.", { status: 503 });
  const result: ScenarioResult = await res.json();

  return new ImageResponse(<PredictionCard games={predictionGames(focusFixtures, choices)} result={result} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

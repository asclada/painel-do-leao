import { ImageResponse } from "next/og";
import { AccessCard, STORY, type CardVariant } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

/** F6 — card de story "Chance de acesso" (1080×1920). ?v=b mostra a variação B (checkpoint visual 3). */
export async function GET(req: Request) {
  const variant: CardVariant = new URL(req.url).searchParams.get("v") === "b" ? "b" : "a";
  return new ImageResponse(<AccessCard variant={variant} />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

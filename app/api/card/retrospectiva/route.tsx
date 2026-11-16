import { ImageResponse } from "next/og";
import { RetroCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

/** Card de story da retrospectiva dos pontos corridos (1080×1920): os momentos da campanha. Gerado no build. */
export async function GET() {
  return new ImageResponse(<RetroCard />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

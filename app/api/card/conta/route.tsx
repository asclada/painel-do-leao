import { ImageResponse } from "next/og";
import { ChangeCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

/** Card de story "A conta mudou" (1080×1920): chance antes x agora. Gerado no build, a cada atualização de dados. */
export async function GET() {
  return new ImageResponse(<ChangeCard />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

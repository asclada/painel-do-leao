import { ImageResponse } from "next/og";
import { AccessCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

/** F6 — card de story "Chances de acesso" (acesso direto e ir aos playoffs) (1080×1920). Gerado no build, que acontece a cada atualização de dados. */
export async function GET() {
  return new ImageResponse(<AccessCard />, {
    ...STORY,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}

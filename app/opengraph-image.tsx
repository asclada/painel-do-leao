import { ImageResponse } from "next/og";
import { OG, OG_ALT, OgCard } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

// Preview do link no WhatsApp/X: gerada no build, que acontece a cada atualização de dados.
export const alt = OG_ALT;
export const size = OG;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<OgCard />, { ...size, fonts: await ogFonts() });
}

import { ImageResponse } from "next/og";
import { OG, OG_ALT, OgCard } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";

// Mesma imagem do Open Graph, para o card grande do X/Twitter.
export const alt = OG_ALT;
export const size = OG;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<OgCard />, { ...size, fonts: await ogFonts() });
}

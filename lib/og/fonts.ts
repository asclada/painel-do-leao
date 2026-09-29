// Fontes do site para as imagens geradas com next/og (o ImageResponse precisa delas como ArrayBuffer).
// Arquivos em assets/fonts (Bebas Neue e Inter, licença OFL); a Vercel os inclui via
// outputFileTracingIncludes no next.config.ts.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), "assets", "fonts");
const load = (file: string) => readFile(join(dir, file)).then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

let cache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[]> | null = null;

export function ogFonts() {
  cache ??= Promise.all([
    load("bebas-neue-latin-400-normal.woff"),
    load("inter-latin-400-normal.woff"),
    load("inter-latin-700-normal.woff"),
    load("inter-latin-800-normal.woff"),
  ]).then(([bebas, i400, i700, i800]) => [
    { name: "Bebas", data: bebas, weight: 400, style: "normal" },
    { name: "Inter", data: i400, weight: 400, style: "normal" },
    { name: "Inter", data: i700, weight: 700, style: "normal" },
    { name: "Inter", data: i800, weight: 800, style: "normal" },
  ]);
  return cache;
}

// Paleta do site (app/globals.css) em hex: o next/og não entende variáveis CSS.
export const C = {
  bg: "#081230",
  surface: "#0f1f4d",
  surface2: "#16296a",
  blue: "#1d4ed8",
  sky: "#7aa2ff",
  red: "#e11d2e",
  white: "#ffffff",
  muted: "#a8b4d8",
  win: "#22c55e",
  draw: "#94a3b8",
  loss: "#e11d2e",
  line: "rgba(168,180,216,0.18)",
} as const;

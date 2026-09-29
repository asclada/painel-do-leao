// Escudos para as imagens do next/og (o Satori precisa da imagem embutida). Fortaleza: o escudo do topo do site;
// adversários: os baixados pelo pipeline em public/escudos. Incluídos na função via outputFileTracingIncludes.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FORTALEZA } from "@/lib/data";

export async function crestDataUrl(teamId: string): Promise<string | null> {
  const file =
    teamId === FORTALEZA
      ? join(process.cwd(), "assets", "escudo-fortaleza.png")
      : join(process.cwd(), "public", "escudos", `${teamId}.png`);
  try {
    const buf = await readFile(file);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null; // sem escudo: o card mostra a sigla
  }
}

// Escudos dos adversários baixados pelo pipeline (pipeline/crests.py) em public/escudos/{time}.png.
// Só no servidor (lê o disco no build).
import { existsSync } from "node:fs";
import { join } from "node:path";

export function crestSrc(teamId: string): string | null {
  return existsSync(join(process.cwd(), "public", "escudos", `${teamId}.png`)) ? `/escudos/${teamId}.png` : null;
}

import type { StandingRow } from "@/lib/generated/outputs";
import { plural } from "@/lib/format";

/** Frase de situação do topo e a distância que mais importa naquele momento. */
export function situation(table: StandingRow[], teamId: string) {
  const me = table.find((r) => r.teamId === teamId)!;
  const at = (pos: number) => table.find((r) => r.position === pos)!;
  const pos = me.position;

  if (pos <= 2) {
    const gap = me.points - at(3).points;
    return {
      zone: "g2" as const,
      title: "Na zona de acesso direto",
      gap: gap === 0 ? "Empatado em pontos com o 3º" : `${plural(gap, "ponto")} à frente do 3º`,
    };
  }
  const toSecond = at(2).points - me.points;
  const toSecondTxt = toSecond === 0 ? "Empatado em pontos com o 2º" : `A ${plural(toSecond, "ponto")} do 2º`;
  if (pos <= 6) return { zone: "g6" as const, title: "Na zona dos playoffs", gap: toSecondTxt };
  if (pos <= 16) {
    const toSixth = at(6).points - me.points;
    return {
      zone: "mid" as const,
      title: `Fora do G6, a ${plural(toSixth, "ponto")} da zona dos playoffs`,
      gap: toSecondTxt,
    };
  }
  return { zone: "z4" as const, title: "Na zona de rebaixamento", gap: `A ${plural(at(16).points - me.points, "ponto")} de sair` };
}

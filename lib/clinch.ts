// Garantido ou eliminado na matemática (pipeline/calc/clinch.py), para não mostrar "100%" ou "0%" que a simulação
// deu sem que seja certeza — como o "quase 100%" do Chance de Gol.
import { simulation } from "@/lib/data";

export type ClinchStatus = "clinched" | "eliminated" | "open";

function clinchOf(teamId: string) {
  return simulation.clinch?.[teamId];
}

/**
 * Chance em texto que respeita a matemática: 100% só quando garantido, 0% só quando eliminado.
 * Em aberto, o que a simulação arredondaria para 100% ou 0% vira ">99%" ou "<1%".
 */
export function chanceLabel(p: number, status: ClinchStatus = "open") {
  if (status === "clinched") return "100%";
  if (status === "eliminated") return "0%";
  const v = p * 100;
  if (v >= 99.5) return ">99%";
  if (v < 0.5) return "<1%";
  return `${Math.round(v)}%`;
}

/** Status de cada chance mostrada no site. */
export function statusOf(teamId: string) {
  const c = clinchOf(teamId);
  const direct: ClinchStatus = c?.direct ?? "open";
  const g6: ClinchStatus = c?.g6 ?? "open";
  const top16: ClinchStatus = c?.top16 ?? "open";
  return {
    direct,
    g6,
    // subir (direto ou playoffs): garantido com o G2 garantido; impossível fora do G6
    promotion: (direct === "clinched" ? "clinched" : g6 === "eliminated" ? "eliminated" : "open") as ClinchStatus,
    // subir pelos playoffs: impossível fora do G6 ou com o G2 garantido
    playoffs: (g6 === "eliminated" || direct === "clinched" ? "eliminated" : "open") as ClinchStatus,
    // 3º a 6º: impossível fora do G6 ou com o G2 garantido
    top6: (g6 === "eliminated" || direct === "clinched" ? "eliminated" : "open") as ClinchStatus,
    // risco de rebaixamento: zero com o top 16 garantido; certo se já não dá para sair do Z4
    relegation: (top16 === "clinched" ? "eliminated" : top16 === "eliminated" ? "clinched" : "open") as ClinchStatus,
  };
}

/** Selo do topo quando a matemática já decidiu algo (null = tudo em aberto). */
export function clinchBadge(teamId: string): { text: string; good: boolean } | null {
  const s = statusOf(teamId);
  if (s.direct === "clinched") return { text: "Acesso garantido!", good: true };
  if (s.g6 === "clinched") return { text: "Vaga no G6 garantida", good: true };
  if (s.g6 === "eliminated") return { text: "Sem chance matemática de acesso", good: false };
  if (s.direct === "eliminated") return { text: "Sem chance matemática de acesso direto", good: false };
  return null;
}

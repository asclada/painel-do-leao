// Frases do simulador "E se?" (F4) e do card "Minha previsão" (F6). Regras simples, sem IA.
import { plural } from "@/lib/format";
import type { MagicNumbers, ScenarioResult } from "@/lib/generated/scenario";

/** Chance de terminar entre os 6 primeiros (G2 + 3º a 6º). */
export function pG6(r: ScenarioResult) {
  return Math.min(1, r.focus.pDirect + r.focus.pTop6);
}

export function scenarioPhrase(r: ScenarioResult, noChoices: boolean) {
  const { pDirect, pRelegation, pPromotion } = r.focus;
  if (pRelegation > 0.05) return "Cuidado: com esses resultados o risco lá embaixo aparece.";
  if (pDirect >= 0.9) return "Com esses resultados, o acesso direto fica praticamente garantido.";
  if (noChoices) return "Sem escolhas, todos os jogos são sorteados: são os mesmos números do topo da página.";
  if (pDirect >= 0.5) return "Boa chance de subir direto, mas ainda depende dos rivais.";
  if (pG6(r) >= 0.6) return "Com isso, o caminho mais provável é pelos playoffs.";
  if (pPromotion < 0.2) return "Com esses resultados, o acesso vira missão difícil.";
  return "Ainda dá para subir, mas vai depender bastante dos rivais.";
}

/** "Com 68 pontos, a chance de subir direto passa de 90%." (+ tradução em vitórias) */
export function magicPhrase(m: MagicNumbers) {
  if (m.pointsFor90Direct == null) return null;
  const pts = `Com ${m.pointsFor90Direct} pontos, a chance de subir direto passa de 90%.`;
  if (m.winsNeededDirect == null || m.winsNeededDirect === 0) return pts;
  return `${pts} Dá para chegar lá com ${plural(m.winsNeededDirect, "vitória")} nos ${m.remainingGames} jogos que faltam.`;
}

/** Pontos finais: exato quando tudo foi escolhido, senão o valor mais provável com a faixa. */
export function finalPoints(r: ScenarioResult) {
  const exact = r.finalPointsMin === r.finalPointsMax;
  return {
    exact,
    value: exact ? r.finalPointsMin : r.focus.pointsP50,
    low: r.focus.pointsP10,
    high: r.focus.pointsP90,
  };
}

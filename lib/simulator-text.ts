// Frases do simulador "E se?" (F4) e do card "Minha previsão" (F6). Regras simples, sem IA.
import { plural } from "@/lib/format";
import type { MagicNumbers, ScenarioResult } from "@/lib/generated/scenario";

/** Chance de terminar entre os 6 primeiros (G2 + 3º a 6º). */
export function pG6(r: ScenarioResult) {
  return Math.min(1, r.focus.pDirect + r.focus.pTop6);
}

export function scenarioPhrase(r: ScenarioResult) {
  const { pDirect, pRelegation, pPromotion } = r.focus;
  if (pRelegation > 0.05) return "Cuidado: com esses resultados o risco lá embaixo aparece.";
  if (pDirect >= 0.9) return "Com esses resultados, o acesso direto fica praticamente garantido.";
  if (pDirect >= 0.5) return "Boa chance de subir direto, mas ainda depende dos rivais.";
  if (pG6(r) >= 0.6) return "Com isso, o caminho mais provável é pelos playoffs.";
  if (pPromotion < 0.01) return "Com esses resultados, o acesso fica praticamente fora de alcance.";
  if (pPromotion < 0.2) return "Com esses resultados, o acesso vira missão difícil.";
  return "Ainda dá para subir, mas vai depender bastante dos rivais.";
}

/**
 * Compara os pontos finais da previsão com as "marcas" do cenário geral (20 mil simulações):
 * a partir de `pointsFor90Direct` pontos, o Fortaleza subiu direto em mais de 90% das temporadas;
 * a partir de `pointsFor90Top6`, terminou no G6 em mais de 90%. Muda a cada previsão.
 */
export function pointsPhrase(points: number, m: MagicNumbers) {
  const direct = m.pointsFor90Direct;
  const top6 = m.pointsFor90Top6;
  if (direct == null) return null;
  if (points >= direct) {
    return `Com ${points} pontos, o Leão ${points === direct ? "chega à" : "passa da"} marca de ${direct}: a partir dela, a chance de subir direto fica acima de 90%.`;
  }
  const gap = direct - points;
  const base = `Com ${points} pontos, ${gap === 1 ? "faltaria" : "faltariam"} ${plural(gap, "ponto")} para a marca de ${direct}, que deixa a chance de subir direto acima de 90%.`;
  if (top6 == null || top6 >= direct) return base;
  return points >= top6
    ? `${base} Mas já passa dos ${top6}, que deixam a chance de ficar no G6 acima de 90%.`
    : `${base} Para ficar no G6 com mais de 90% de chance, a marca é ${top6}.`;
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

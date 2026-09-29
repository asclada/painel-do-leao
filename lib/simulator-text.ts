// Frases do simulador "E se?" (F4) e do card "Minha previsão" (F6). Regras simples, sem IA.
import { pct, plural } from "@/lib/format";
import type { MagicNumbers, ScenarioResult } from "@/lib/generated/scenario";

/** Chance de terminar entre os 6 primeiros (G2 + 3º a 6º). */
export function pG6(r: ScenarioResult) {
  return Math.min(1, r.focus.pDirect + r.focus.pTop6);
}

/**
 * Frase principal + detalhe do cenário. A "posição mais provável" olha uma posição por vez; já os
 * caminhos somam faixas (G2 = 1º e 2º; playoffs = 3º a 6º). Quando os dois discordam (ex.: 2º é a
 * posição mais provável, mas 3º a 6º somados passam do G2), a frase explica a divisão em vez de se
 * contradizer.
 */
export function scenarioPhrase(r: ScenarioResult): { title: string; detail: string | null } {
  const { pDirect, pTop6, pRelegation, pPromotion } = r.focus;
  const best = r.mostLikelyPosition;
  const split =
    pDirect > 0 && pTop6 > 0
      ? `Em ${pct(pDirect)} das simulações o Leão termina no G2 e sobe direto; em ${pct(pTop6)}, fica entre o 3º e o 6º e vai aos playoffs. A diferença está nos pontos que os rivais diretos fizerem.`
      : null;

  if (pRelegation > 0.05)
    return { title: "Cuidado: com esses resultados o risco lá embaixo aparece.", detail: `Chance de terminar no Z4: ${pct(pRelegation)}.` };
  if (pDirect >= 0.9)
    return { title: "Com esses resultados, o acesso direto fica praticamente garantido.", detail: null };
  if (pPromotion < 0.01)
    return { title: "Com esses resultados, o acesso fica praticamente fora de alcance.", detail: null };
  if (pDirect >= 0.5)
    return { title: "Boa chance de subir direto, mas ainda depende dos rivais.", detail: split };
  if (best <= 2 && pTop6 > pDirect)
    return {
      title: `Briga apertada: o ${best}º lugar é a posição mais provável, mas somando do 3º ao 6º lugar os playoffs ficam um pouco mais prováveis.`,
      detail: split,
    };
  if (pTop6 >= 0.5)
    return { title: "Com isso, o caminho mais provável é pelos playoffs.", detail: split };
  if (pPromotion < 0.2)
    return {
      title: "Com esses resultados, o acesso vira missão difícil.",
      detail: pG6(r) > 0 ? `O Leão fica no G6 em só ${pct(pG6(r))} das simulações.` : null,
    };
  return { title: "Ainda dá para subir, mas vai depender bastante dos rivais.", detail: split };
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

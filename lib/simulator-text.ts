// Frases do simulador "E se?" (F4) e do card "Minha previsão" (F6). Regras simples, sem IA.
import { pct, pct1, plural } from "@/lib/format";
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
  const { pDirect, pTop6, pRelegation } = r.focus;
  const g6 = pG6(r);
  const best = r.mostLikelyPosition;
  const split =
    pDirect > 0 && pTop6 > 0
      ? `Em ${pct1(pDirect)} das simulações o Leão termina no G2 e sobe direto; em ${pct1(pTop6)}, fica entre o 3º e o 6º e vai aos playoffs. A diferença está nos pontos que os rivais diretos fizerem.`
      : null;

  if (pRelegation > 0.05)
    return { title: "Cuidado: com esses resultados o risco lá embaixo aparece.", detail: `Chance de terminar no Z4: ${pct(pRelegation)}.` };
  if (pDirect >= 0.9)
    return { title: "Com esses resultados, o acesso direto fica praticamente garantido.", detail: null };
  if (g6 < 0.01)
    return { title: "Com esses resultados, o Leão fica fora do G6 e o acesso sai de alcance.", detail: null };
  if (pDirect >= 0.5)
    return { title: "Boa chance de subir direto, mas ainda depende dos rivais.", detail: split };
  if (best <= 2 && pTop6 > pDirect)
    return {
      title: `Briga apertada: o ${best}º lugar é a posição mais provável, mas somando do 3º ao 6º lugar os playoffs ficam um pouco mais prováveis.`,
      detail: split,
    };
  if (pTop6 >= 0.5)
    return { title: "Com isso, o caminho mais provável é pelos playoffs.", detail: split };
  if (g6 < 0.35)
    return {
      title: "Com esses resultados, o acesso vira missão difícil.",
      detail: `O Leão fica no G6 em só ${pct1(g6)} das simulações.`,
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
    return `Com ${points} pontos, o Leão ${points === direct ? "chega à" : "passa da"} marca de ${direct}: a partir dela, a chance de acesso direto fica acima de 90%.`;
  }
  const gap = direct - points;
  const base = `Com ${points} pontos, ${gap === 1 ? "faltaria" : "faltariam"} ${plural(gap, "ponto")} para a marca de ${direct}, que deixa a chance de acesso direto acima de 90%.`;
  if (top6 == null || top6 >= direct) return base;
  return points >= top6
    ? `${base} Mas já passa dos ${top6}, que deixam a chance de ficar no G6 acima de 90%.`
    : `${base} Para ficar no G6 com mais de 90% de chance, a marca é ${top6}.`;
}

/** "5 vitórias, 2 empates e 1 derrota" */
function tally(w: number, d: number, l: number) {
  return `${plural(w, "vitória")}, ${plural(d, "empate")} e ${plural(l, "derrota")}`;
}

/**
 * A "cara" da previsão (card "Minha previsão", provocação e simulador): um título curto e uma frase, pelas
 * escolhas e pelo que a simulação diz delas. A primeira regra que se aplica vence. Sem IA, sem texto livre.
 */
export function predictionPersona(choices: string, r: ScenarioResult): { title: string; line: string } {
  const picks = choices.split("").filter((c) => c === "V" || c === "E" || c === "D");
  const n = picks.length;
  const w = picks.filter((c) => c === "V").length;
  const d = picks.filter((c) => c === "E").length;
  const l = picks.filter((c) => c === "D").length;
  const { pDirect, pTop6 } = r.focus;
  const g6 = pG6(r);

  if (n > 0 && w === n) return { title: "Fé inabalável", line: `${n} vitórias em ${n} jogos. Coração tricolor não conhece derrota.` };
  if (l === 0 && w >= n - 2) return { title: "Otimista de carteirinha", line: `Nenhuma derrota nos ${plural(n, "jogo")} que faltam.` };
  if (n > 0 && l >= Math.ceil(n / 2)) return { title: "Pessimista de plantão", line: `${plural(l, "derrota")} em ${n} jogos. Tá secando o próprio time?` };
  if (n > 0 && d >= Math.ceil(n / 2)) return { title: "O rei do empate", line: `${plural(d, "empate")} em ${n} jogos. Nem tanto ao céu, nem tanto à terra.` };
  if (pDirect >= 0.9) return { title: "Sobe direto, sem sustos", line: `${tally(w, d, l)} bastam para o G2.` };
  if (g6 >= 0.7 && pTop6 > pDirect) return { title: "Vai ser nos playoffs", line: "Emoção até o fim: o caminho mais provável é o mata-mata." };
  if (g6 < 0.35) return { title: "Sofrimento até a rodada 38", line: "Com esses resultados, o acesso vira missão difícil." };
  return { title: "Pé no chão", line: `${tally(w, d, l)}: nem oba-oba, nem desespero.` };
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

import { chanceLabel, statusOf, type ClinchStatus } from "@/lib/clinch";
import { FORTALEZA, fortalezaOdds, simulation } from "@/lib/data";
import { pct, plural } from "@/lib/format";

/** Frase de destaque da seção (usada no título da seção em app/page.tsx). */
export function projectionHeadline() {
  const { pointsP50: mid } = fortalezaOdds;
  const { remainingGames } = simulation.magic;
  return `O mais provável é o Leão fechar a Série B com uns ${mid} pontos. Faltam ${plural(remainingGames, "jogo")}.`;
}

/** Risco perto de zero vira texto (decisão do Lucas: mostrar "praticamente zero"); "zero" só quando a matemática
 * garante que o Leão não cai. */
function riskLabel(p: number, status: ClinchStatus) {
  if (status === "eliminated") return "zero";
  if (status === "clinched") return "rebaixado";
  return p < 0.01 ? "praticamente zero" : pct(p);
}

type Mark = { pts: number; goal: string; wins: number | null };

/** "Com 63 pontos, o G6 fica quase garantido. Faltam 11: dá com 4 vitórias nos 8 jogos que restam." */
function markSentence(m: Mark, current: number, remaining: number) {
  const missing = m.pts - current;
  if (missing <= 0) return `Com ${m.pts} pontos, ${m.goal} fica quase garantido, e o Leão já chegou lá.`;
  const how =
    m.wins == null
      ? "mesmo vencendo tudo, fica difícil"
      : `dá com ${plural(m.wins, "vitória")} ${m.wins === remaining ? "em todos os" : "nos"} ${plural(remaining, "jogo")} que restam`;
  return `Com ${m.pts} pontos, ${m.goal} fica quase garantido. Faltam ${missing}: ${how}.`;
}

/**
 * "Até a rodada 38": a pontuação mais provável em destaque, a faixa onde o Leão termina em 8 de cada 10 simulações,
 * as marcas de pontos explicadas em frase, a chance de ficar no G6 e o risco de rebaixamento.
 * Tudo vem de data/simulation.json, recalculado pelo cron a cada rodada.
 */
export function Projection() {
  const { min, probs } = simulation.focusPoints;
  const { pointsP10: lo, pointsP50: mid, pointsP90: hi, pRelegation, pDirect, pTop6 } = fortalezaOdds;
  const magic = simulation.magic;
  const max = Math.max(...probs, 0.0001);
  const last = min + probs.length - 1;
  const g6 = Math.min(1, pDirect + pTop6);
  const st = statusOf(FORTALEZA);

  const marks = [
    magic.pointsFor90Top6 != null ? { pts: magic.pointsFor90Top6, goal: "a vaga no G6", wins: magic.winsNeededTop6 ?? null } : null,
    magic.pointsFor90Direct != null
      ? { pts: magic.pointsFor90Direct, goal: "o acesso direto", wins: magic.winsNeededDirect ?? null }
      : null,
  ].filter((m): m is Mark => m !== null);
  const onChart = marks.filter((m) => m.pts >= min && m.pts <= last);
  const x = (pts: number) => `${((pts - min + 0.5) / probs.length) * 100}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
        <h3 className="text-sm font-semibold text-muted">Pontuação mais provável no fim</h3>
        <p className="mt-1 font-display text-7xl leading-none">
          {mid} <span className="text-3xl text-muted">pontos</span>
        </p>
        <p className="mt-2 text-white/90">
          Em 8 de cada 10 simulações, o Leão termina entre <strong>{lo}</strong> e <strong>{hi} pontos</strong>.
        </p>

        <div
          className="mt-6"
          role="img"
          aria-label={`Chance de terminar com cada pontuação, de ${min} a ${last} pontos. O mais provável é ${mid} pontos; a faixa de ${lo} a ${hi} pontos reúne 8 de cada 10 simulações.`}
        >
          <div className="relative flex h-32 items-end gap-[2px] pt-6" aria-hidden>
            {probs.map((p, i) => {
              const pts = min + i;
              const cls = pts === mid ? "bg-white" : pts >= lo && pts <= hi ? "bg-white/55" : "bg-white/20";
              return (
                <div
                  key={pts}
                  className={`flex-1 rounded-t-[3px] ${cls}`}
                  style={{ height: p > 0 ? `max(${(p / max) * 100}%, 2px)` : 0 }}
                  title={`${pts} pontos: ${pct(p)}`}
                />
              );
            })}
            {onChart.map((m) => (
              <div key={m.pts} className="absolute bottom-0 top-0 flex flex-col items-center" style={{ left: x(m.pts), transform: "translateX(-50%)" }}>
                <span className="text-xs font-bold text-white tabular">{m.pts}</span>
                <span className="w-0.5 flex-1 bg-win" />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted tabular" aria-hidden>
            <span>{min} pts</span>
            <span>{last} pts</span>
          </div>
        </div>

        {marks.length > 0 && (
          <ul className="mt-5 space-y-2 text-white/90">
            {marks.map((m) => (
              <li key={m.pts} className="flex gap-3">
                <span className="mt-1.5 h-4 w-0.5 shrink-0 bg-win" aria-hidden />
                <span>{markSentence(m, magic.currentPoints, magic.remainingGames)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">&quot;Quase garantido&quot;: acontece em pelo menos 9 de cada 10 simulações que terminam com essa pontuação.</p>
      </div>

      <dl className="grid gap-4">
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <dt className="text-sm font-semibold text-muted">Chance de terminar no G6</dt>
          <dd className="mt-1 font-display text-6xl leading-none text-win">{chanceLabel(g6, st.g6)}</dd>
          <dd className="mt-1 text-sm text-muted">Do 1º ao 6º lugar: sobe direto ou vai aos playoffs.</dd>
        </div>
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <dt className="text-sm font-semibold text-muted">Risco de rebaixamento</dt>
          <dd className={`mt-1 font-display leading-none ${pRelegation < 0.01 ? "text-4xl" : "text-6xl"}`}>
            {riskLabel(pRelegation, st.relegation)}
          </dd>
          <dd className="mt-1 text-sm text-muted">
            {st.relegation === "eliminated"
              ? "Livre do rebaixamento: pela conta de pontos, o Leão já não cai para o Z4."
              : "Chance de terminar entre o 17º e o 20º lugar."}
          </dd>
        </div>
      </dl>
    </div>
  );
}

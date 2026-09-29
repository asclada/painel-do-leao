import { fortalezaOdds, simulation } from "@/lib/data";
import { pct } from "@/lib/format";

/** Frase de destaque da seção (usada no título da seção em app/page.tsx). */
export function projectionHeadline() {
  const { pointsP10: lo, pointsP90: hi } = fortalezaOdds;
  return `Pelas simulações, o Leão deve terminar a Série B entre ${lo} e ${hi} pontos.`;
}

/** Risco perto de zero vira texto (decisão do Lucas: mostrar "praticamente zero"). */
function riskLabel(p: number) {
  return p < 0.01 ? "praticamente zero" : pct(p);
}

/**
 * "Até a rodada 38": faixa mais provável de pontos (80% das simulações), a chance de ficar no G6 e o
 * risco de rebaixamento. Tudo vem de data/simulation.json, recalculado pelo cron a cada rodada com a
 * distribuição preditiva bayesiana (pipeline/model).
 */
export function Projection() {
  const { min, probs } = simulation.focusPoints;
  const { pointsP10: lo, pointsP50: mid, pointsP90: hi, pRelegation, pDirect, pTop6 } = fortalezaOdds;
  const { pointsFor90Direct: direct, pointsFor90Top6: top6 } = simulation.magic;
  const max = Math.max(...probs, 0.0001);
  const last = min + probs.length - 1;
  const g6 = Math.min(1, pDirect + pTop6);

  const marks = [
    top6 != null && top6 >= min && top6 <= last ? { pts: top6, label: `${top6}: G6 quase certo` } : null,
    direct != null && direct >= min && direct <= last ? { pts: direct, label: `${direct}: acesso direto quase certo` } : null,
  ].filter((m): m is { pts: number; label: string } => m !== null);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
        <h3 className="text-sm font-semibold text-muted">Faixa mais provável de pontos no fim</h3>
        <p className="mt-1 font-display text-6xl leading-none">
          {lo} a {hi} <span className="text-3xl text-muted">pontos</span>
        </p>
        <p className="mt-2 text-white/90">
          Em 8 de cada 10 simulações, o Leão termina nessa faixa. O ponto do meio é <strong>{mid} pontos</strong>.
        </p>

        <div
          className="mt-6"
          role="img"
          aria-label={`Chance de terminar com cada pontuação, de ${min} a ${last} pontos. A faixa de ${lo} a ${hi} pontos reúne 80% das simulações.`}
        >
          <div className="relative flex h-28 items-end gap-[2px]" aria-hidden>
            {probs.map((p, i) => {
              const pts = min + i;
              const inRange = pts >= lo && pts <= hi;
              return (
                <div
                  key={pts}
                  className={`flex-1 rounded-t-[3px] ${inRange ? "bg-white" : "bg-white/25"}`}
                  style={{ height: p > 0 ? `max(${(p / max) * 100}%, 2px)` : 0 }}
                  title={`${pts} pontos: ${pct(p)}`}
                />
              );
            })}
            {marks.map((m) => (
              <div
                key={m.pts}
                className="absolute bottom-0 top-0 w-0.5 bg-win"
                style={{ left: `calc(${((m.pts - min + 0.5) / probs.length) * 100}% - 1px)` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted tabular" aria-hidden>
            <span>{min} pts</span>
            <span>{last} pts</span>
          </div>
          {marks.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-0.5 bg-win" aria-hidden /> Marcas de 90% de chance:
              </span>
              {marks.map((m) => (
                <span key={m.pts} className="text-white">
                  {m.label}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <dl className="grid gap-4">
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <dt className="text-sm font-semibold text-muted">Chance de terminar no G6</dt>
          <dd className="mt-1 font-display text-6xl leading-none text-win">{pct(g6)}</dd>
          <dd className="mt-1 text-sm text-muted">Do 1º ao 6º lugar: sobe direto ou vai aos playoffs.</dd>
        </div>
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <dt className="text-sm font-semibold text-muted">Risco de rebaixamento</dt>
          <dd className={`mt-1 font-display leading-none ${pRelegation < 0.01 ? "text-4xl" : "text-6xl"}`}>
            {riskLabel(pRelegation)}
          </dd>
          <dd className="mt-1 text-sm text-muted">Chance de terminar entre o 17º e o 20º lugar.</dd>
        </div>
      </dl>
    </div>
  );
}

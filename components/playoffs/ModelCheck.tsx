import { GrowBar } from "@/components/ui/GrowBar";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { calibration, FORTALEZA, teamById } from "@/lib/data";
import { pct } from "@/lib/format";

/** Frase de destaque da seção "O modelo acertou?". */
export function modelCheckHeadline() {
  const checks = calibration.season?.checks ?? [];
  if (!checks.length) return undefined;
  const mid = checks.find((c) => c.round === 19) ?? checks[0];
  return `Depois da rodada ${mid.round}, com metade do campeonato pela frente, o modelo já apontava ${mid.hits} dos 6 times que terminaram no G6.`;
}

/**
 * "O modelo acertou?": a temporada inteira conferida. O G6 que o modelo apontava em três momentos (os 6 com mais
 * chance) contra o G6 final, a frase de calibração da temporada e as faixas de chance, recolhidas.
 */
export function ModelCheck() {
  const s = calibration.season;
  const checks = s?.checks ?? [];
  const finalG6 = s?.finalG6 ?? [];
  if (!s || !checks.length) return null;
  const final = new Set(finalG6);
  const bins = s.binsG6.filter((b) => b.n >= 10);

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 lg:grid-cols-3">
        {checks.map((c) => (
          <li key={c.round} className="flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
            <p className="text-sm font-semibold text-muted">Depois da rodada {c.round}</p>
            <p className="mt-1 text-lg font-semibold leading-snug">
              Acertou <span className="font-display text-3xl leading-none text-win">{c.hits}</span> dos 6 do G6
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Os 6 com mais chance de G6 naquele momento">
              {c.predictedG6.map((id) => {
                const hit = final.has(id);
                const t = teamById[id];
                return (
                  <li
                    key={id}
                    className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs ring-1 ${
                      hit ? "bg-surface-2 ring-win/60" : "bg-bg text-muted ring-line line-through decoration-white/40"
                    }`}
                    title={hit ? `${t.name}: terminou no G6` : `${t.name}: não terminou no G6`}
                  >
                    <MiniCrest team={t} />
                    {t.shortName}
                  </li>
                );
              })}
            </ul>
            <p className="mt-auto pt-3 text-sm text-muted">
              Chance do Leão naquele momento: <strong className="text-white">{pct(c.focusPG6)}</strong> ({c.focusPosition}º)
            </p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
        <h3 className="text-sm font-semibold text-muted">O G6 final</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {finalG6.map((id, i) => (
            <li key={id} className={`flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm ring-1 ${id === FORTALEZA ? "ring-white/60" : "ring-line"}`}>
              <MiniCrest team={teamById[id]} />
              {i + 1}º {teamById[id].name}
            </li>
          ))}
        </ul>
        {s.summary && <p className="mt-4 text-white/90">{s.summary}</p>}
        {calibration.summary && <p className="mt-2 text-sm text-muted">{calibration.summary}</p>}

        {bins.length > 0 && (
          <LazyDetails
            className="mt-4 text-sm"
            summary={
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-white">
                Ver faixa por faixa
              </summary>
            }
          >
            <p className="mt-2 text-muted">
              Todas as chances de G6 dadas a todos os times, rodada a rodada, separadas por faixa. Se o modelo é bom, quem
              recebia cerca de 30% de chance termina no G6 cerca de 30% das vezes.
            </p>
            <ul className="mt-3 space-y-3">
              {bins.map((b) => (
                <li key={b.lo}>
                  <p className="flex justify-between gap-3">
                    <span>
                      Dava entre {Math.round(b.lo * 100)}% e {Math.round(b.hi * 100)}%{" "}
                      <span className="text-muted">({b.n} casos)</span>
                    </span>
                    <span className="font-semibold tabular">terminou no G6: {pct(b.observed)}</span>
                  </p>
                  <div className="mt-1 grid gap-1">
                    <GrowBar value={b.predicted} color="var(--sky)" height="h-1.5" label={`Chance média prevista: ${pct(b.predicted)}`} />
                    <GrowBar value={b.observed} color="var(--win)" height="h-1.5" label={`Terminou no G6: ${pct(b.observed)}`} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-sky" /> chance média dada</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-win" /> terminou no G6</span>
            </p>
          </LazyDetails>
        )}
      </div>
    </div>
  );
}

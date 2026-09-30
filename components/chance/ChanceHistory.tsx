import { ChanceChart, type ChancePoint } from "@/components/chance/ChanceChart";
import { ShareButton } from "@/components/share/ShareButton";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { chanceChange, changeText, scoreLine } from "@/lib/chance";
import { history } from "@/lib/data";
import { pct } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function chancePoints(): ChancePoint[] {
  return history.map((h, i) => ({
    round: h.round,
    p: h.pPromotion,
    position: h.position,
    points: h.points,
    partial: !!h.partial,
    live: i === history.length - 1,
  }));
}

/** Frase de destaque da seção: de onde a chance saiu, o pico e onde está agora. */
export function chanceHeadline() {
  if (history.length < 2) return undefined;
  const first = history[0];
  const now = history.at(-1)!;
  const peak = history.reduce((a, b) => (b.pPromotion > a.pPromotion ? b : a));
  const peakTxt =
    peak === now ? "e nunca foi tão alta quanto agora" : `e chegou a ${pct(peak.pPromotion)} depois da rodada ${peak.round}`;
  return `Depois da rodada ${first.round}, a chance de subir era ${pct(first.pPromotion)}. Hoje é ${pct(now.pPromotion)}, ${peakTxt}.`;
}

/**
 * "Como a chance mudou" + "A conta mudou". A linha vem do backtest (data/history.json): a conta refeita depois de
 * cada rodada, só com os jogos disputados até ali. O último ponto é a chance de agora, a mesma do topo.
 */
export function ChanceHistory() {
  const points = chancePoints();
  const change = chanceChange();
  const summary = `Gráfico da chance de o Fortaleza subir depois de cada rodada: ${points
    .map((p) => `rodada ${p.round}, ${pct(p.p)}`)
    .join("; ")}.`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
        <h3 className="text-sm font-semibold text-muted">Chance de subir depois de cada rodada</h3>
        <div className="mt-3" role="img" aria-label={summary}>
          <ChanceChart points={points} />
        </div>
        <LazyDetails
          className="mt-3 text-sm"
          summary={
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-white">
              Ver os números rodada a rodada
            </summary>
          }
        >
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl ring-1 ring-line">
            <table className="w-full text-left tabular">
              <thead className="sticky top-0 bg-surface-2 text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Rodada</th>
                  <th className="px-3 py-2 font-semibold">Posição</th>
                  <th className="px-3 py-2 font-semibold">Pontos</th>
                  <th className="px-3 py-2 text-right font-semibold">Chance de subir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...points].reverse().map((p) => (
                  <tr key={p.round}>
                    <td className="px-3 py-2">{p.live ? `${p.round} (agora)` : p.round}</td>
                    <td className="px-3 py-2">{p.position}º</td>
                    <td className="px-3 py-2">{p.points}</td>
                    <td className="px-3 py-2 text-right font-semibold">{pct(p.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LazyDetails>
      </div>

      {change && (
        <div className="flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <h3 className="text-xl font-semibold">A conta mudou</h3>
          <p className="mt-1 text-sm text-muted">
            Rodada {change.game.round}: {scoreLine(change.game)}
          </p>
          <div className="mt-5 flex items-end gap-3 font-display leading-none">
            <span className="text-5xl text-muted">{change.from}%</span>
            <span className="pb-1 text-3xl text-muted" aria-hidden>
              →
            </span>
            <span className="text-7xl text-win">{change.to}%</span>
          </div>
          <p className="mt-3 text-white/90">
            Antes da rodada {change.beforeRound + 1}, a chance de subir era {change.from}%. Agora, contando todos os
            jogos já disputados,{" "}
            {change.diff === 0 ? "ela continua igual" : `ela ${change.diff > 0 ? "subiu" : "caiu"} para ${change.to}%`}.
          </p>
          <div className="mt-auto pt-5">
            <ShareButton
              image="/api/card/conta"
              fileName="fortaleza-a-conta-mudou.png"
              link={SITE_URL}
              text={`A chance de o Fortaleza subir ${changeText(change)}, segundo o ${SITE_NAME}.`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

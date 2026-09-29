import type { ReactNode } from "react";
import { GrowBar } from "@/components/ui/GrowBar";
import { meta, teamById, xray } from "@/lib/data";
import { plural, shortDate } from "@/lib/format";
import type { GoalBin, VenueSplit } from "@/lib/generated/outputs";

/** Bloco do raio-x: frase de destaque em cima, visual simples embaixo, detalhes recolhidos. */
function Block({ title, insight, children, details, className = "" }: {
  title: string; insight?: string; children: ReactNode; details?: ReactNode; className?: string;
}) {
  return (
    <article className={`rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {insight && <p className="mt-1 text-lg font-semibold leading-snug">{insight}</p>}
      <div className="mt-4">{children}</div>
      {details && (
        <details className="mt-4 text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted underline-offset-4 hover:underline">
            Ver detalhes
          </summary>
          <div className="mt-2 text-muted">{details}</div>
        </details>
      )}
    </article>
  );
}

function Venue({ label, v }: { label: string; v: VenueSplit }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <span className="font-display text-4xl leading-none tabular">{v.pct}%</span>
      </div>
      <GrowBar value={v.pct / 100} label={`${label}: ${v.pct}% dos pontos`} />
      <p className="mt-1.5 text-sm text-muted">
        {v.wins}V {v.draws}E {v.losses}D · {plural(v.points, "ponto")}
      </p>
    </div>
  );
}

function Bins({ bins }: { bins: GoalBin[] }) {
  const max = Math.max(...bins.flatMap((b) => [b.goalsFor, b.goalsAgainst]), 1);
  const best = bins.reduce((a, b) => (b.goalsFor > a.goalsFor ? b : a));
  const worst = bins.reduce((a, b) => (b.goalsAgainst > a.goalsAgainst ? b : a));
  return (
    <div>
      <div className="flex h-40 items-end gap-2" role="img"
        aria-label={`Gols por faixa de minutos: ${bins.map((b) => `${b.label}: ${b.goalsFor} pró, ${b.goalsAgainst} contra`).join("; ")}`}>
        {bins.map((b) => (
          <div key={b.label} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1">
              <div className={`w-1/2 rounded-t ${b === best ? "bg-red" : "bg-red/70"}`} style={{ height: `${(b.goalsFor / max) * 100}%` }} />
              <div className={`w-1/2 rounded-t ${b === worst ? "bg-white/70" : "bg-white/30"}`} style={{ height: `${(b.goalsAgainst / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 text-center text-[11px] text-muted">
        {bins.map((b) => (
          <span key={b.label} className="flex-1">{b.label}</span>
        ))}
      </div>
      <p className="mt-3 flex gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red" /> gols marcados</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-white/40" /> gols sofridos</span>
      </p>
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3">
      <p className="font-display text-4xl leading-none tabular">{n}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

/** F5 — Raio-X do time. No máximo 3 números por bloco; o resto em "Ver detalhes". */
export function XRay() {
  const { home, away, halves, goalBins, firstTurn, secondTurn, streaks, insights } = xray;
  const fmt1 = (x: number) => x.toFixed(1).replace(".", ",");
  const lastLossOpp = streaks.lastLossOpponentId ? teamById[streaks.lastLossOpponentId]?.name : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Block title="Castelão x fora de casa" insight={insights.venue}
        details={<p>Gols em casa: {home.goalsFor} pró e {home.goalsAgainst} contra. Fora: {away.goalsFor} pró e {away.goalsAgainst} contra.</p>}>
        <div className="grid gap-5">
          <Venue label="No Castelão" v={home} />
          <Venue label="Fora de casa" v={away} />
        </div>
      </Block>

      {halves && (
        <Block title="1º tempo x 2º tempo" insight={insights.halves}
          details={<p>Gols marcados: {halves.firstFor} no 1º tempo e {halves.secondFor} no 2º. Sofridos: {halves.firstAgainst} e {halves.secondAgainst}.</p>}>
          <div className="grid grid-cols-2 gap-3">
            {([["1º tempo", halves.firstFor - halves.firstAgainst], ["2º tempo", halves.secondFor - halves.secondAgainst]] as const).map(([label, s]) => (
              <div key={label} className="rounded-xl bg-surface-2/60 p-3">
                <p className="text-sm text-muted">{label}</p>
                <p className={`font-display text-5xl leading-none tabular ${s > 0 ? "text-win" : s < 0 ? "text-white/60" : ""}`}>
                  {s > 0 ? `+${s}` : s}
                </p>
                <p className="text-sm text-muted">de saldo</p>
              </div>
            ))}
          </div>
          {/* o que muda depois do intervalo (ideia do painel do Náutico) */}
          <p className="mt-4 rounded-xl bg-surface-2/60 p-3 text-sm leading-relaxed text-white/90">
            <strong className="text-white">Depois do intervalo:</strong> terminou melhor em {plural(halves.improved ?? 0, "jogo")},
            pior em {plural(halves.worsened ?? 0, "jogo")} e igual em {plural(halves.kept ?? 0, "jogo")}. Saldo:{" "}
            <strong className={(halves.pointsSwing ?? 0) > 0 ? "text-win" : "text-white"}>
              {(halves.pointsSwing ?? 0) > 0 ? "+" : ""}
              {plural(halves.pointsSwing ?? 0, "ponto")}
            </strong>{" "}
            em relação ao placar do intervalo.
          </p>
        </Block>
      )}

      {meta.hasGoalMinutes && goalBins && (
        <Block title="Gols por faixa de minutos" insight={insights.goalBins} className="md:col-span-2">
          <Bins bins={goalBins} />
        </Block>
      )}

      <Block title="1º turno x returno" insight={insights.turns}
        details={<p>1º turno: {plural(firstTurn.points, "ponto")} em {plural(firstTurn.played, "jogo")} ({firstTurn.pct}%). Returno até agora: {plural(secondTurn.points, "ponto")} em {plural(secondTurn.played, "jogo")} ({secondTurn.pct}%).</p>}>
        <div className="grid grid-cols-2 gap-3">
          <Stat n={fmt1(firstTurn.ppg)} label="pontos por jogo no 1º turno" />
          <Stat n={fmt1(secondTurn.ppg)} label="pontos por jogo no returno" />
        </div>
      </Block>

      <Block title="Sequências" insight={insights.streaks}
        details={lastLossOpp && streaks.lastLossDate ? <p>Última derrota: {lastLossOpp}, em {shortDate(streaks.lastLossDate)}.</p> : undefined}>
        <div className="grid grid-cols-3 gap-3">
          <Stat n={streaks.longestUnbeaten} label="maior série invicta" />
          <Stat n={streaks.longestWins} label="maior série de vitórias" />
          <Stat n={streaks.cleanSheets} label="jogos sem sofrer gol" />
        </div>
      </Block>
    </div>
  );
}

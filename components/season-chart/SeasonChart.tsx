"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { TOTAL_ROUNDS, type Row } from "@/components/season-chart/shared";
import type { Milestone, Team, Timeline } from "@/lib/generated/outputs";

const SeasonChartPlot = dynamic(() => import("@/components/season-chart/SeasonChartPlot"), { ssr: false });

/**
 * F2 — A montanha-russa: posição do Fortaleza rodada a rodada (1º no topo),
 * faixas de G2/G6/Z4, marcos e (opcional) linhas dos rivais da corrida.
 */
export function SeasonChart({
  timeline,
  teams,
  rivalIds,
  idPrefix = "tl",
}: {
  timeline: Timeline;
  teams: Record<string, Team>;
  rivalIds: string[];
  idPrefix?: string;
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showRivals, setShowRivals] = useState(false);
  const [active, setActive] = useState<Milestone | null>(null);

  // desenha a linha só quando o gráfico entra na tela (uma vez)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rows: Row[] = useMemo(() => {
    const byRound = new Map(timeline.points.map((p) => [p.round, p]));
    return Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
      const round = i + 1;
      const p = byRound.get(round);
      const row: Row = { round, fort: p?.position ?? null, point: p };
      for (const id of rivalIds) row[id] = timeline.rivals[id]?.[i] ?? null;
      return row;
    });
  }, [timeline, rivalIds]);

  const last = timeline.points.at(-1);

  // marcos acima da linha; quando dois ficam a até 2 rodadas, o seguinte vai para o outro lado
  const markerY = useMemo(() => {
    const out: { m: Milestone; y: number }[] = [];
    let prev: { round: number; above: boolean } | null = null;
    for (const m of timeline.milestones) {
      const p = timeline.points.find((x) => x.round === m.round);
      if (!p) continue;
      const fitsAbove = p.position - 1.6 >= 0.8;
      const fitsBelow = p.position + 1.6 <= 20.2;
      let above = fitsAbove; // perto do topo, vai para baixo
      let gap = 1.6;
      if (prev && m.round - prev.round <= 2 && prev.above === above) {
        if (above ? fitsBelow : fitsAbove) above = !above;
        else gap = 3.2; // não cabe do outro lado: afasta mais do mesmo lado
      }
      out.push({ m, y: above ? p.position - gap : p.position + gap });
      prev = { round: m.round, above };
    }
    return out;
  }, [timeline]);
  const milestoneIndex = new Map(timeline.milestones.map((m, i) => [m.round, i + 1]));
  const summary = `Gráfico da posição do Fortaleza em cada rodada. ${timeline.headline} Posições: ${timeline.points
    .map((p) => `rodada ${p.round}, ${p.position}º`)
    .join("; ")}.`;

  const hatchId = `${idPrefix}-z4`;

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative -mx-2 h-[320px] sm:mx-0 sm:h-[420px]"
        role="img"
        aria-label={summary}
      >
        {visible && (
          <SeasonChartPlot rows={rows} teams={teams} rivalIds={rivalIds} showRivals={showRivals} reduce={!!reduce}
            hatchId={hatchId} markerY={markerY} active={active} setActive={setActive} />
        )}
      </div>

      {/* marcos: tocar abre o texto (também funciona sem mirar no gráfico) */}
      <ol className="mt-4 flex flex-wrap gap-2" aria-label="Marcos da temporada">
        {timeline.milestones.map((m) => {
          const on = active?.round === m.round;
          return (
            <li key={m.round}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setActive(on ? null : m)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm ring-1 transition-colors ${
                  on ? "bg-white text-bg ring-white" : "bg-surface ring-line hover:bg-surface-2"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${on ? "bg-bg text-white" : "bg-surface-2"}`}>
                  {milestoneIndex.get(m.round)}
                </span>
                {m.title}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 min-h-12 text-white/90" aria-live="polite">
        {active ? active.text : last ? `Toque num marco ou num ponto da linha para ver a rodada.` : ""}
      </p>

      <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted">
        <input type="checkbox" className="h-5 w-5 accent-[var(--red)]" checked={showRivals}
          onChange={(e) => setShowRivals(e.target.checked)} />
        Mostrar os rivais da corrida (linhas cinza)
      </label>
    </div>
  );
}

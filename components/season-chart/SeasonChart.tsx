"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { TOTAL_ROUNDS, type Row } from "@/components/season-chart/shared";
import type { Team, Timeline } from "@/lib/generated/outputs";

const SeasonChartPlot = dynamic(() => import("@/components/season-chart/SeasonChartPlot"), { ssr: false });

/**
 * F2 — A montanha-russa: posição do Fortaleza rodada a rodada (1º no topo) e faixas de G2/G6/Z4. Tocar num ponto
 * mostra a rodada. Marcos e linhas dos rivais saíram em 30/09, a pedido do Lucas: o gráfico fica só com a campanha.
 */
export function SeasonChart({
  timeline,
  teams,
  idPrefix = "tl",
}: {
  timeline: Timeline;
  teams: Record<string, Team>;
  idPrefix?: string;
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
      return row;
    });
  }, [timeline]);

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
          <SeasonChartPlot rows={rows} teams={teams} reduce={!!reduce} hatchId={hatchId} />
        )}
      </div>

      {timeline.points.length > 0 && (
        <p className="mt-3 text-sm text-muted">Toque num ponto da linha para ver a rodada.</p>
      )}
    </div>
  );
}

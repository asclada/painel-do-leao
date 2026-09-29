"use client";

import { useEffect, useRef, useState } from "react";
import { pct } from "@/lib/format";

export type ChancePoint = {
  round: number;
  p: number; // chance de subir (0..1)
  position: number;
  points: number;
  partial: boolean; // rodada em andamento (a chance de agora)
  live: boolean; // último ponto = a chance de agora
};

const TOTAL_ROUNDS = 38;
const M = { top: 20, right: 44, bottom: 28, left: 40 };
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS = [1, 10, 20, 30, 38];

function label(p: ChancePoint) {
  if (p.live) return p.partial ? `Agora (rodada ${p.round} em andamento)` : `Agora, depois da rodada ${p.round}`;
  return `Depois da rodada ${p.round}`;
}

/**
 * "Como a chance mudou": uma linha só (chance de subir, em verde como no resto do site), SVG leve sem biblioteca.
 * Tocar ou passar o dedo mostra a rodada; a tabela com os números fica logo abaixo (ChanceHistory).
 */
export function ChanceChart({ points }: { points: ChancePoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const iw = Math.max(0, w - M.left - M.right);
  const ih = Math.max(0, h - M.top - M.bottom);
  const x = (r: number) => M.left + ((r - 1) / (TOTAL_ROUNDS - 1)) * iw;
  const y = (p: number) => M.top + (1 - p) * ih;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.round).toFixed(1)},${y(p.p).toFixed(1)}`).join("");
  const first = points[0];
  const last = points.at(-1);
  const area = first && last ? `${line}L${x(last.round)},${y(0)}L${x(first.round)},${y(0)}Z` : "";
  const active = hover != null ? points[hover] : null;

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const round = 1 + ((e.clientX - rect.left - M.left) / iw) * (TOTAL_ROUNDS - 1);
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.round - round) < Math.abs(points[best].round - round)) best = i;
    });
    setHover(best);
  }

  // tooltip: fica dentro do gráfico, dos dois lados do ponto
  const tipLeft = active ? Math.min(Math.max(x(active.round) - 110, 0), Math.max(0, w - 220)) : 0;

  return (
    <div ref={wrap} className="relative h-[240px] w-full select-none sm:h-[300px]">
      {w > 0 && (
        <svg
          width={w}
          height={h}
          className="block touch-pan-y"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setHover(null)}
          aria-hidden
        >
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted)" className="tabular">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          {X_TICKS.map((r) => (
            <text key={r} x={x(r)} y={h - 8} textAnchor="middle" fontSize={12} fill="var(--muted)" className="tabular">
              {r === 1 && w >= 480 ? "Rodada 1" : r}
            </text>
          ))}

          <path d={area} fill="var(--win)" fillOpacity={0.1} />
          <path d={line} fill="none" stroke="var(--win)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {last && (
            <>
              <circle cx={x(last.round)} cy={y(last.p)} r={5} fill="var(--win)" stroke="var(--bg)" strokeWidth={2} />
              <text x={x(last.round) + 10} y={y(last.p)} dy="0.32em" fontSize={14} fontWeight={700} fill="var(--white)">
                {pct(last.p)}
              </text>
            </>
          )}

          {active && (
            <>
              <line x1={x(active.round)} x2={x(active.round)} y1={M.top} y2={y(0)} stroke="rgb(255 255 255 / 0.3)" strokeWidth={1} />
              <circle cx={x(active.round)} cy={y(active.p)} r={6} fill="var(--bg)" stroke="var(--white)" strokeWidth={2.5} />
            </>
          )}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute w-[220px] rounded-lg bg-surface-2 px-3 py-2 text-sm shadow-lg ring-1 ring-line"
          // chance alta: a linha está no alto, então o aviso vai para baixo (e vice-versa)
          style={active.p > 0.55 ? { left: tipLeft, bottom: M.bottom + 6 } : { left: tipLeft, top: 0 }}
        >
          <p className="font-semibold">{label(active)}</p>
          <p className="text-muted">
            {active.position}º lugar, {active.points} pts
          </p>
          <p>
            Chance de subir: <strong>{pct(active.p)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

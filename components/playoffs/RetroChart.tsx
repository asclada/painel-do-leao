"use client";

import { useEffect, useRef, useState } from "react";
import { pct } from "@/lib/format";

export type RetroPoint = { round: number; p: number; position: number };
export type RetroMark = { n: number; round: number; title: string };

const TOTAL_ROUNDS = 38;
const M = { top: 22, right: 16, bottom: 28, left: 40 };
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS = [1, 10, 20, 30, 38];

/**
 * A chance de terminar no G6 rodada a rodada (uma linha), com os momentos da retrospectiva numerados em cima dela.
 * Tocar num número (ou na lista ao lado) destaca o momento.
 */
export function RetroChart({
  points,
  marks,
  active,
  onActive,
}: {
  points: RetroPoint[];
  marks: RetroMark[];
  active: number | null;
  onActive: (n: number | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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
  const at = (r: number) => points.find((p) => p.round === r);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.round).toFixed(1)},${y(p.p).toFixed(1)}`).join("");
  const area = points.length
    ? `${line}L${x(points.at(-1)!.round).toFixed(1)},${y(0)}L${x(points[0].round).toFixed(1)},${y(0)}Z`
    : "";
  const act = marks.find((m) => m.n === active);
  const actPoint = act ? at(act.round) : null;

  return (
    <div ref={wrap} className="relative h-[240px] w-full select-none sm:h-[280px]">
      {w > 0 && (
        <svg width={w} height={h} className="block" aria-hidden>
          <defs>
            <linearGradient id="retro-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--win)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--win)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <path d={area} fill="url(#retro-fill)" />
          <path d={line} fill="none" stroke="var(--win)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
          {actPoint && (
            <line x1={x(actPoint.round)} x2={x(actPoint.round)} y1={M.top} y2={y(0)} stroke="rgb(255 255 255 / 0.35)" strokeWidth={1} />
          )}
          {marks.map((m, i) => {
            const p = at(m.round);
            if (!p) return null;
            const on = active === m.n;
            // momentos na mesma rodada: empilha os números para cima (ou para baixo, perto do topo)
            const stack = marks.slice(0, i).filter((o) => o.round === m.round).length;
            const cy = y(p.p) + stack * 26 * (p.p > 0.8 ? 1 : -1);
            return (
              <g
                key={m.n}
                className="cursor-pointer"
                onPointerEnter={() => onActive(m.n)}
                onPointerDown={() => onActive(on ? null : m.n)}
              >
                <circle cx={x(p.round)} cy={cy} r={on ? 13 : 11} fill={on ? "var(--white)" : "var(--blue)"} stroke="var(--bg)" strokeWidth={2} />
                <text x={x(p.round)} y={cy} dy="0.35em" textAnchor="middle" fontSize={12} fontWeight={800} fill={on ? "var(--bg)" : "var(--white)"}>
                  {m.n}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {act && actPoint && (
        <div
          className="pointer-events-none absolute w-[210px] rounded-lg bg-surface-2 px-3 py-2 text-sm shadow-lg ring-1 ring-line"
          style={{
            left: Math.min(Math.max(x(actPoint.round) - 105, 0), Math.max(0, w - 210)),
            ...(actPoint.p > 0.55 ? { bottom: M.bottom + 6 } : { top: 0 }),
          }}
        >
          <p className="font-semibold">{act.title}</p>
          <p className="text-muted">
            Rodada {actPoint.round}: {actPoint.position}º, {pct(actPoint.p)} de chance de G6
          </p>
        </div>
      )}
    </div>
  );
}

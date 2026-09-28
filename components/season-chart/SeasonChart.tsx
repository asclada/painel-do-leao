"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Milestone, Team, Timeline, TimelinePoint } from "@/lib/generated/outputs";

// Checkpoint 2 (M1, ajustado pelo Lucas): linha branca; ponto verde na vitória, cinza no empate, vermelho na derrota.
const RESULT_FILL = { V: "var(--win)", E: "var(--draw)", D: "var(--loss)" } as const;
const TOTAL_ROUNDS = 38;

type Row = { round: number; fort: number | null; point?: TimelinePoint } & Record<string, number | null | TimelinePoint | undefined>;

function scoreLine(p: TimelinePoint, teams: Record<string, Team>) {
  if (p.result == null || !p.opponentId) return "Sem jogo nesta rodada";
  const opp = teams[p.opponentId]?.name ?? p.opponentId;
  return p.home
    ? `Fortaleza ${p.goalsFor} x ${p.goalsAgainst} ${opp} (casa)`
    : `${opp} ${p.goalsAgainst} x ${p.goalsFor} Fortaleza (fora)`;
}

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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 4, left: -18 }}>
              <defs>
                <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="rgb(168 180 216 / 0.06)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(168 180 216 / 0.22)" strokeWidth="2" />
                </pattern>
              </defs>

              <ReferenceArea y1={0.5} y2={2.5} fill="var(--blue)" fillOpacity={0.38} ifOverflow="hidden"
                label={{ value: "G2", position: "insideTopRight", fill: "#fff", fontSize: 12, fontWeight: 700 }} />
              <ReferenceArea y1={2.5} y2={6.5} fill="var(--blue)" fillOpacity={0.16} ifOverflow="hidden"
                label={{ value: "G6", position: "insideTopRight", fill: "var(--muted)", fontSize: 12, fontWeight: 700 }} />
              <ReferenceArea y1={16.5} y2={20.5} fill={`url(#${hatchId})`} ifOverflow="hidden"
                label={{ value: "Z4", position: "insideBottomRight", fill: "var(--muted)", fontSize: 12, fontWeight: 700 }} />

              <XAxis dataKey="round" type="number" domain={[1, TOTAL_ROUNDS]} ticks={[1, 5, 10, 15, 20, 25, 30, 35, 38]}
                tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis reversed domain={[0.5, 20.5]} ticks={[1, 2, 6, 10, 16, 20]} tickFormatter={(v) => `${v}º`}
                tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />

              <Tooltip
                cursor={{ stroke: "rgb(255 255 255 / 0.25)" }}
                content={({ active: on, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  const p = row?.point;
                  if (!on || !p) return null;
                  return (
                    <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm shadow-lg ring-1 ring-line">
                      <p className="font-semibold">
                        Rodada {p.round} — {p.position}º lugar, {p.points} pts
                      </p>
                      <p className="text-muted">{scoreLine(p, teams)}</p>
                    </div>
                  );
                }}
              />

              {showRivals &&
                rivalIds.map((id) => (
                  <Line key={id} dataKey={id} type="monotone" stroke="rgb(168 180 216 / 0.45)" strokeWidth={1.25}
                    dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                ))}

              <Line
                dataKey="fort"
                type="linear"
                stroke="var(--white)"
                strokeWidth={2.5}
                connectNulls={false}
                isAnimationActive={!reduce}
                animationDuration={1600}
                animationEasing="ease-out"
                dot={(props) => {
                  const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload: Row; index: number };
                  const p = payload.point;
                  if (cx == null || cy == null || !p) return <g key={index} />;
                  const fill = p.result ? RESULT_FILL[p.result] : "var(--draw)";
                  return <circle key={index} cx={cx} cy={cy} r={4.5} fill={fill} stroke="var(--bg)" strokeWidth={1.5} />;
                }}
                activeDot={{ r: 7, fill: "var(--bg)", stroke: "var(--white)", strokeWidth: 3 }}
              />

              {markerY.map(({ m, y }, i) => {
                const on = active?.round === m.round;
                return (
                  <ReferenceDot key={m.round} x={m.round} y={y} r={on ? 12 : 10}
                    fill={on ? "var(--white)" : "var(--surface-2)"} stroke="var(--white)" strokeWidth={1.5}
                    ifOverflow="visible"
                    label={{ value: i + 1, fill: on ? "var(--bg)" : "var(--white)", fontSize: 11, fontWeight: 700 }}
                    onClick={() => setActive(on ? null : m)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
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

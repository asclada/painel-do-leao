"use client";

// Parte do gráfico que depende do Recharts: carregada sob demanda (next/dynamic) quando a
// montanha-russa entra na tela, para não pesar no carregamento inicial do celular.
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Team, TimelinePoint } from "@/lib/generated/outputs";
import { RESULT_FILL, TOTAL_ROUNDS, type Row } from "@/components/season-chart/shared";

function scoreLine(p: TimelinePoint, teams: Record<string, Team>) {
  if (p.result == null || !p.opponentId) return "Sem jogo nesta rodada";
  const opp = teams[p.opponentId]?.name ?? p.opponentId;
  return p.home
    ? `Fortaleza ${p.goalsFor} x ${p.goalsAgainst} ${opp} (casa)`
    : `${opp} ${p.goalsAgainst} x ${p.goalsFor} Fortaleza (fora)`;
}

export default function SeasonChartPlot({
  rows,
  teams,
  reduce,
  hatchId,
}: {
  rows: Row[];
  teams: Record<string, Team>;
  reduce: boolean;
  hatchId: string;
}) {
  return (
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

      </LineChart>
    </ResponsiveContainer>
  );
}

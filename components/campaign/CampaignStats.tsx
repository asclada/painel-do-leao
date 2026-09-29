"use client";

import { useState } from "react";
import type { Record as VenueRecord, StandingRow } from "@/lib/generated/outputs";
import { plural } from "@/lib/format";

type Scope = "todos" | "casa" | "fora";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "todos", label: "Todos os jogos" },
  { id: "casa", label: "No Castelão" },
  { id: "fora", label: "Fora de casa" },
];

type Numbers = { played: number; wins: number; draws: number; losses: number; points: number; gf: number; ga: number };

function fromRow(r: StandingRow): Numbers {
  return { played: r.played, wins: r.wins, draws: r.draws, losses: r.losses, points: r.points, gf: r.goalsFor, ga: r.goalsAgainst };
}

function fromVenue(v: VenueRecord): Numbers {
  return {
    played: v.played ?? 0, wins: v.wins ?? 0, draws: v.draws ?? 0, losses: v.losses ?? 0,
    points: v.points ?? 0, gf: v.goalsFor ?? 0, ga: v.goalsAgainst ?? 0,
  };
}

const decimal = (x: number) => x.toFixed(2).replace(".", ",");

/**
 * A campanha em números: aproveitamento, V/E/D, média de pontos e saldo de gols,
 * com recorte por mando. Lê a linha do Fortaleza em data/standings.json (atualizada pelo cron).
 */
export function CampaignStats({ row }: { row: StandingRow }) {
  const [scope, setScope] = useState<Scope>("todos");
  const n = scope === "todos" ? fromRow(row) : fromVenue(scope === "casa" ? row.home : row.away);
  const possible = n.played * 3;
  const pct = possible ? Math.round((100 * n.points) / possible) : 0;
  const ppg = n.played ? n.points / n.played : 0;
  const gd = n.gf - n.ga;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Recorte dos jogos">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scope === s.id}
            onClick={() => setScope(s.id)}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 transition-colors ${
              scope === s.id ? "bg-white text-bg ring-white" : "bg-surface ring-line hover:bg-surface-2"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
        <Card label="Aproveitamento">
          <dd className="font-display text-5xl leading-none tabular">{pct}%</dd>
          <dd className="mt-1 text-sm text-muted">
            {n.points} de {plural(possible, "ponto possível", "pontos possíveis")}
          </dd>
        </Card>
        <Card label="Campanha">
          <dd className="flex items-end gap-3 font-display text-5xl leading-none tabular">
            <span className="text-win">{n.wins}</span>
            <span className="text-draw">{n.draws}</span>
            <span className="text-loss">{n.losses}</span>
          </dd>
          <dd className="mt-1 text-sm text-muted">
            {plural(n.wins, "vitória")}, {plural(n.draws, "empate")} e {plural(n.losses, "derrota")}
          </dd>
        </Card>
        <Card label="Média por jogo">
          <dd className="font-display text-5xl leading-none tabular">{decimal(ppg)}</dd>
          <dd className="mt-1 text-sm text-muted">pontos, de no máximo 3,00</dd>
        </Card>
        <Card label="Saldo de gols">
          <dd className="font-display text-5xl leading-none tabular">{gd > 0 ? `+${gd}` : gd}</dd>
          <dd className="mt-1 text-sm text-muted">
            {n.gf} marcados · {n.ga} sofridos
          </dd>
        </Card>
      </dl>
      <p className="mt-3 text-sm text-muted">
        {scope === "todos" ? "Em" : scope === "casa" ? "No Castelão, em" : "Fora de casa, em"} {plural(n.played, "jogo")} na Série B.
      </p>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <dt className="mb-2 text-sm font-semibold text-muted">{label}</dt>
      {children}
    </div>
  );
}

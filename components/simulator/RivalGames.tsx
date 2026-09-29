"use client";

import { ChevronDown } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { shortDate } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import type { Extra, ExtraPick } from "@/lib/simulator-client";

export type RivalFixture = { matchId: string; round: number; kickoffUtc: string; home: Team; away: Team };

/**
 * "E os confrontos diretos?" (opcional): o torcedor também pode escolher os jogos entre os rivais da corrida.
 * Nada escolhido = esses jogos seguem a previsão do modelo (força de ataque e defesa, mando, jogos recentes), como
 * antes. Na interface nunca falar em "sorteio" (pedido do Lucas, 29/09): passa a ideia de algo aleatório.
 */
export function RivalGames({
  games,
  extra,
  onPick,
}: {
  games: RivalFixture[];
  extra: Extra;
  onPick: (matchId: string, pick: ExtraPick) => void;
}) {
  if (games.length === 0) return null;
  const chosen = games.filter((g) => extra[g.matchId]).length;

  return (
    <details className="group mt-4 rounded-2xl bg-surface ring-1 ring-line" open={chosen > 0}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-semibold">E os confrontos diretos? (opcional)</span>
          <span className="block text-sm text-muted">
            {chosen > 0
              ? `${chosen} de ${games.length} escolhidos · os outros seguem a previsão do modelo`
              : `${games.length} jogos entre os rivais da corrida. Sem escolha, vale a previsão do modelo, pela força de cada time.`}
          </span>
        </span>
        <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ol className="divide-y divide-line border-t border-line">
        {games.map((g) => {
          const opts: { c: ExtraPick; label: string; text: string }[] = [
            { c: "1", label: `Vitória ${g.home.article === "a" ? "da" : "do"} ${g.home.name}`, text: g.home.shortName },
            { c: "X", label: "Empate", text: "E" },
            { c: "2", label: `Vitória ${g.away.article === "a" ? "da" : "do"} ${g.away.name}`, text: g.away.shortName },
          ];
          return (
            <li key={g.matchId} className="flex items-center gap-2 px-3 py-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold leading-tight">
                  <TeamBadge team={g.home} size="sm" />
                  <span className="text-muted">x</span>
                  <TeamBadge team={g.away} size="sm" />
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  R{g.round} · {shortDate(g.kickoffUtc)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1" role="group" aria-label={`${g.home.name} x ${g.away.name}`}>
                {opts.map((o) => {
                  const on = extra[g.matchId] === o.c;
                  return (
                    <button
                      key={o.c}
                      type="button"
                      aria-pressed={on}
                      aria-label={o.label}
                      title={o.label}
                      onClick={() => onPick(g.matchId, o.c)}
                      className={`h-11 min-w-11 rounded-xl px-1.5 font-display text-lg leading-none ring-1 transition-colors ${
                        on ? "bg-white text-bg ring-white" : "bg-bg/40 text-muted ring-line hover:bg-surface-2 hover:text-white"
                      }`}
                    >
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

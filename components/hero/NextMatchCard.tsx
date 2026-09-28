import { Countdown } from "@/components/hero/Countdown";
import { FormDots } from "@/components/ui/FormDots";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { FORTALEZA, teamById } from "@/lib/data";
import { kickoffLabel } from "@/lib/format";
import type { NextMatch } from "@/lib/generated/outputs";

export function NextMatchCard({ match }: { match: NextMatch }) {
  const opp = teamById[match.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = match.home ? [fort, opp] : [opp, fort];
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <p className="text-sm text-muted">
        Próximo jogo · rodada {match.round} · {match.home ? "no Castelão" : "fora de casa"}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <TeamBadge team={home} />
        <span className="font-display text-xl text-muted">x</span>
        <TeamBadge team={away} />
        <div className="ml-1 min-w-0">
          <p className="truncate font-semibold leading-tight">
            {home.name} x {away.name}
          </p>
          <p className="truncate text-sm text-muted">
            {kickoffLabel(match.kickoffUtc)}
            {match.venue && ` · ${match.venue}`}
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <Countdown kickoffUtc={match.kickoffUtc} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {match.firstTurn && <span>1º turno: <span className="text-white">{match.firstTurn}</span></span>}
        <span className="inline-flex items-center gap-2">
          {opp.name} nos últimos 5: <FormDots form={match.formOpponent} size="sm" />
        </span>
      </div>
    </div>
  );
}

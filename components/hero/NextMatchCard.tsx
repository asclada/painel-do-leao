import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { Countdown } from "@/components/hero/Countdown";
import { FormDots } from "@/components/ui/FormDots";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { FORTALEZA, teamById } from "@/lib/data";
import { kickoffLabel, venueName } from "@/lib/format";
import type { NextMatch, Team } from "@/lib/generated/outputs";

// Os dois escudos do mesmo tamanho (pedido do Lucas, 29/09).
const CREST_BOX = "h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]";

/** Escudo do adversário baixado pelo pipeline (pipeline/crests.py); sem arquivo, mostra a sigla. */
function hasCrest(teamId: string) {
  return existsSync(join(process.cwd(), "public", "escudos", `${teamId}.png`));
}

function Crest({ team }: { team: Team }) {
  if (team.id === FORTALEZA) {
    return (
      <span className={`relative flex items-center justify-center ${CREST_BOX}`}>
        <Image src={escudoFortaleza} alt="Escudo do Fortaleza" className="h-full w-auto object-contain" loading="eager" />
      </span>
    );
  }
  return (
    <span className={`relative flex items-center justify-center ${CREST_BOX}`}>
      {hasCrest(team.id) ? (
        <Image src={`/escudos/${team.id}.png`} alt={`Escudo do ${team.name}`} fill sizes="96px" loading="eager" className="object-contain" />
      ) : (
        <TeamBadge team={team} size="lg" />
      )}
    </span>
  );
}

/** Card do próximo jogo (F1): mandante à esquerda, visitante à direita, sempre com os escudos. */
export function NextMatchCard({ match }: { match: NextMatch }) {
  const opp = teamById[match.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = match.home ? [fort, opp] : [opp, fort];

  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
      {/* selo em destaque: azul da faixa tricolor (o vermelho fica reservado para a chance de subir) */}
      <p className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
          <span className="font-bold">Próximo jogo</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
          <span>Rodada {match.round}</span>
        </span>
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {[home, away].map((t, i) => (
          <div key={t.id} className={`flex flex-col items-center gap-2 text-center ${i === 1 ? "col-start-3" : ""}`}>
            <Crest team={t} />
            <span className={`text-lg leading-tight sm:text-xl ${t.id === FORTALEZA ? "font-bold" : "font-semibold"}`}>
              {t.name}
            </span>
          </div>
        ))}
        <span className="col-start-2 row-start-1 font-display text-4xl text-muted" aria-hidden>
          x
        </span>
      </div>
      <p className="sr-only">
        {home.name} x {away.name}
      </p>

      <div className="mt-4 text-center">
        <p className="text-lg font-semibold sm:text-xl">{kickoffLabel(match.kickoffUtc)}</p>
        {match.venue && (
          <p className="mt-0.5 text-base text-muted">
            Estádio: <span className="text-white">{venueName(match.venue)}</span>
            {match.city && ` · ${match.city}`}
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-center border-t border-line pt-4">
        <Countdown kickoffUtc={match.kickoffUtc} large />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted sm:text-base">
        {match.firstTurn && (
          <span>
            1º turno: <span className="text-white">{match.firstTurn}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-2">
          {opp.name} nos últimos 5: <FormDots form={match.formOpponent} size="sm" />
        </span>
      </div>
    </div>
  );
}

import Image from "next/image";
import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { Countdown } from "@/components/hero/Countdown";
import { FormDots } from "@/components/ui/FormDots";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA, teamById } from "@/lib/data";
import { kickoffLabel, pct, venueName } from "@/lib/format";
import type { MatchChances, NextMatch, Team } from "@/lib/generated/outputs";

// Os dois escudos do mesmo tamanho (pedido do Lucas, 29/09).
const CREST_BOX = "h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]";

function Crest({ team }: { team: Team }) {
  if (team.id === FORTALEZA) {
    return (
      <span className={`relative flex items-center justify-center ${CREST_BOX}`}>
        <Image src={escudoFortaleza} alt="Escudo do Fortaleza" className="h-full w-auto object-contain" loading="eager" />
      </span>
    );
  }
  // escudo baixado pelo pipeline; sem arquivo, mostra a sigla
  const src = crestSrc(team.id);
  return (
    <span className={`relative flex items-center justify-center ${CREST_BOX}`}>
      {src ? (
        <Image src={src} alt={`Escudo do ${team.name}`} width={104} height={104} loading="eager" className="h-full w-full object-contain" />
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
      {/* selo em destaque: azul da faixa tricolor (mesmo estilo do selo da chance de subir) */}
      <p className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
          <span className="font-bold">Próximo jogo</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
          <span>Rodada {match.round}</span>
        </span>
      </p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mt-7">
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

      {match.chances && <MatchChancesBar chances={match.chances} />}

      <p className="mt-4 flex justify-center">
        <a
          href="#palpite"
          className="inline-flex min-h-11 items-center rounded-full bg-red px-5 text-sm font-semibold text-white hover:bg-[#c81727]"
        >
          Dê seu palpite para o placar
        </a>
      </p>
    </div>
  );
}

/**
 * Chance de vitória, empate e derrota do Leão neste jogo (mesmo modelo da simulação; a ideia do Chance de Gol).
 * Barra única dividida em três, com as cores de resultado do site; os números ficam em texto, ao lado das bolinhas.
 */
function MatchChancesBar({ chances }: { chances: MatchChances }) {
  const parts = [
    { key: "V", label: "Vitória", p: chances.win, bar: "bg-win", dot: "bg-win" },
    { key: "E", label: "Empate", p: chances.draw, bar: "bg-draw", dot: "bg-draw" },
    { key: "D", label: "Derrota", p: chances.loss, bar: "bg-loss", dot: "bg-loss" },
  ];
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-center text-sm font-semibold text-muted">Chances do Leão neste jogo</p>
      <div
        className="mt-2 flex h-3 gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={`Chances do Leão neste jogo: ${parts.map((x) => `${x.label.toLowerCase()} ${pct(x.p)}`).join(", ")}`}
      >
        {parts.map((x) => (
          <span key={x.key} className={x.bar} style={{ width: `${x.p * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-3 text-center text-sm" aria-hidden>
        {parts.map((x) => (
          <li key={x.key} className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${x.dot}`} />
              {x.label}
            </span>
            <strong className="text-lg tabular">{pct(x.p)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

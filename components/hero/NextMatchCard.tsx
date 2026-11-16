import Image from "next/image";
import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { FormDots } from "@/components/ui/FormDots";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA, teamById } from "@/lib/data";
import { kickoffLabel, pct, venueName } from "@/lib/format";
import type { MatchChances, NextMatch, Team } from "@/lib/generated/outputs";
import { focus, focusTie, legForFocus, legName, legScoreLine, needPhrase } from "@/lib/playoffs";

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

/**
 * Card do próximo jogo (F1): mandante à esquerda, visitante à direita, sempre com os escudos. Gêmeo do card
 * "Situação atual" (mesma altura no computador). A contagem regressiva saiu em 01/10, a pedido do Lucas.
 */
export function NextMatchCard({ match }: { match: NextMatch }) {
  const opp = teamById[match.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = match.home ? [fort, opp] : [opp, fort];

  return (
    <div className="flex h-full flex-col rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
      {/* selo em destaque: azul da faixa tricolor (mesmo estilo do selo das chances do topo) */}
      <p className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
          <span className="font-bold">Próximo jogo</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
          <span>{match.leg ? `Playoffs · ${legName(match.leg).replace("Jogo de ", "")}` : `Rodada ${match.round}`}</span>
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
            {match.venueGuessed && " (a confirmar)"}
          </p>
        )}
      </div>

      {/* pontos corridos: duas informações separadas por um traço (pedido do Lucas, 01/10); 1º turno discreto. No
          celular, uma embaixo da outra (cada uma inteira na sua linha) com um traço curto entre elas; com mais espaço,
          duas colunas com título em cima e o traço vertical no meio, qualquer que seja o tamanho do nome do adversário */}
      {match.leg ? (
        <PlayoffInfo leg={match.leg} />
      ) : (
      <div
        className={`mt-4 flex flex-col items-center gap-2 border-t border-line pt-4 text-center text-sm text-muted sm:grid sm:gap-3 ${
          match.firstTurn ? "sm:grid-cols-[1fr_auto_1fr]" : "sm:grid-cols-1"
        }`}
      >
        {match.firstTurn && (
          <>
            <p>
              1º turno<span className="sm:hidden">:</span>{" "}
              <span className="sm:mt-0.5 sm:block">{match.firstTurn}</span>
            </p>
            <span aria-hidden className="h-px w-10 bg-white/25 sm:h-10 sm:w-px" />
          </>
        )}
        <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
          <p>
            {opp.name} nos últimos 5<span className="sm:hidden">:</span>
          </p>
          <FormDots form={match.formOpponent} size="sm" />
        </div>
      </div>
      )}

      {match.chances && <MatchChancesBar chances={match.chances} />}

      {/* no rodapé do card, alinhado com o "Compartilhar" do card ao lado */}
      <p className="mt-auto flex justify-center pt-4">
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
 * Nos playoffs, no lugar do "1º turno": antes da ida, os dois jogos contra o adversário nos pontos corridos; antes da
 * volta, o placar da ida e do que o Leão precisa.
 */
function PlayoffInfo({ leg }: { leg: number }) {
  if (!focus || !focusTie) return null;
  const first = focusTie.legs.find((l) => l.leg === 1);
  const firstScore = first ? legForFocus(first) : null;
  if (leg === 2 && first && firstScore) {
    const need = needPhrase(firstScore.f - firstScore.o, focus.better);
    return (
      <div className="mt-4 border-t border-line pt-4 text-center">
        <p className="text-sm text-muted">Ida: {legScoreLine(first)}</p>
        <p className="mt-1 text-lg font-semibold">
          Na volta, o Leão {need}
        </p>
      </div>
    );
  }
  const h2h = focus.headToHead;
  if (!h2h.length) return null;
  return (
    <div className="mt-4 border-t border-line pt-4 text-center text-sm text-muted">
      <p>Os dois na Série B</p>
      <ul className="mt-1 space-y-0.5 text-white">
        {h2h.map((g) => (
          <li key={g.round}>
            {teamById[g.homeId].name} {g.homeGoals} x {g.awayGoals} {teamById[g.awayId].name}
            <span className="text-muted"> · rodada {g.round}</span>
          </li>
        ))}
      </ul>
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

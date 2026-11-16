import { GrowBar } from "@/components/ui/GrowBar";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { playoffs, teamById } from "@/lib/data";
import { kickoffLabel, pct, venueName } from "@/lib/format";
import type { MarginRow, PlayoffTie, ScoreCell } from "@/lib/generated/outputs";
import {
  advanceLabel,
  focus,
  focusTie,
  legForFocus,
  legName,
  legScoreLine,
  marginLabel,
  needPhrase,
  otherTie,
  rulePhrase,
  tieOutcome,
} from "@/lib/playoffs";

/** Frase de destaque da seção "Do que o Leão precisa". */
export function confrontoHeadline() {
  if (!focus || !playoffs) return undefined;
  const opp = teamById[focus.opponentId].name;
  if (playoffs.state === "finished") return `Fim do confronto com o ${opp}.`;
  if (focus.nextLeg === 2) return "Com a ida decidida, a conta da volta é simples. Veja o que basta e as chances de cada resultado.";
  return `Cada resultado da ida muda a conta da volta. Veja do que o Leão precisa em cada caso e a chance de subir depois de cada um.`;
}

/**
 * Bloco principal dos playoffs: a regra em frase, "do que o Leão precisa" para cada resultado do próximo jogo (com a
 * chance de acontecer e a de subir depois dele), o mapa de placares e o outro confronto.
 */
export function Confronto() {
  if (!focus || !focusTie || !playoffs) return null;
  const opp = teamById[focus.opponentId];
  const first = focusTie.legs.find((l) => l.leg === 1);
  const firstScore = first ? legForFocus(first) : null;
  const soFar = firstScore ? firstScore.f - firstScore.o : 0;
  const nextLeg = focus.nextLeg;
  const margins = focus.margins ?? [];
  const better = focus.better;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-6">
          <h3 className="text-xl font-semibold">A regra</h3>
          <p className="mt-2 text-white/90">{rulePhrase(focus.better, focus.opponentId)}</p>
          <p className="mt-2 text-sm text-muted">
            Não tem pênaltis nem gol fora de casa: vale só a soma dos gols dos dois jogos. Quem passa sobe para a Série A.
          </p>
        </div>
        <ul className="grid gap-3">
          {focusTie.legs.map((l) => {
            const sc = legForFocus(l);
            return (
              <li key={l.matchId} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                <p className="text-sm font-semibold text-muted">{legName(l.leg)}</p>
                <p className="mt-1 font-semibold">
                  {sc ? legScoreLine(l) : `${teamById[l.homeId].name} x ${teamById[l.awayId].name}`}
                </p>
                <p className="text-sm text-muted">
                  {kickoffLabel(l.kickoffUtc)}
                  {l.venue && ` · ${venueName(l.venue)}${l.venueGuessed ? " (a confirmar)" : ""}`}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {nextLeg === null ? (
        <FinalResult />
      ) : (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <h3 className="text-xl font-semibold">
            {nextLeg === 1 ? "Se a ida terminar assim, na volta o Leão..." : `Na volta, contra o ${opp.name}`}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {nextLeg === 1
              ? "Ao lado de cada resultado da ida: a chance de ele acontecer e a chance de o Leão subir depois dele."
              : `Ida: ${first ? legScoreLine(first) : ""}. Ao lado de cada resultado da volta: a chance de ele acontecer.`}
          </p>
          <ul className="mt-4 divide-y divide-line">
            {[...margins].reverse().map((m) => (
              <NeedRow key={m.margin} row={m} soFar={soFar} nextLeg={nextLeg} better={better} />
            ))}
          </ul>
        </div>
      )}

      {nextLeg !== null && (focus.scores?.length ?? 0) > 0 && (
        <LazyDetails
          className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6"
          summary={
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              <span>
                Mapa de placares {nextLeg === 1 ? "da ida" : "da volta"}
                <span className="block text-sm font-normal text-muted">
                  Cada placar com a chance de acontecer e a chance de o Leão subir se ele sair.
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-blue px-4 py-2 text-sm text-white">Ver o mapa</span>
            </summary>
          }
        >
          <ScoreMap cells={focus.scores ?? []} opponentName={opp.name} />
        </LazyDetails>
      )}

      {otherTie && <OtherTie tie={otherTie} />}
    </div>
  );
}

function NeedRow({ row, soFar, nextLeg, better }: { row: MarginRow; soFar: number; nextLeg: number; better: boolean }) {
  const capped = Math.abs(row.margin) >= 3;
  if (nextLeg === 1) {
    return (
      <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_1fr_7rem]">
        <p className="font-semibold">
          {marginLabel(row.margin)}
          <span className="ml-2 text-sm font-normal text-muted">{pct(row.p)}</span>
        </p>
        <p className="col-span-2 row-start-2 text-white/90 sm:col-span-1 sm:row-start-1 sm:col-start-2">
          {needPhrase(row.margin, better, capped)}
        </p>
        <div className="col-start-2 row-start-1 flex flex-col items-end sm:col-start-3">
          <span className="font-display text-3xl leading-none text-win">{advanceLabel(row.pAdvance, false)}</span>
          <span className="text-xs text-muted">de subir</span>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <GrowBar value={row.pAdvance} color="var(--win)" height="h-1.5" />
        </div>
      </li>
    );
  }
  // volta: o resultado já define quem sobe (exceto nas linhas de "3 ou mais", que dependem do placar exato)
  const total = soFar + row.margin;
  const advances = total > 0 || (total === 0 && better);
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <p className="font-semibold">
        {marginLabel(row.margin)}
        <span className="ml-2 text-sm font-normal text-muted">{pct(row.p)}</span>
      </p>
      <span
        className={`rounded-full px-3 py-1 text-sm font-bold ${
          capped && row.pAdvance > 0 && row.pAdvance < 1
            ? "bg-surface-2 ring-1 ring-line"
            : advances
              ? "bg-win text-bg"
              : "bg-surface-2 text-white ring-1 ring-white/25"
        }`}
      >
        {capped && row.pAdvance > 0 && row.pAdvance < 1 ? "Depende do placar" : advances ? "O Leão sobe" : "Não sobe"}
      </span>
    </li>
  );
}

/** Grade de placares: linhas = gols do Leão, colunas = gols do adversário; cor = chance de subir. */
function ScoreMap({ cells, opponentName }: { cells: ScoreCell[]; opponentName: string }) {
  const max = Math.max(...cells.map((c) => c.focusGoals));
  const at = (f: number, o: number) => cells.find((c) => c.focusGoals === f && c.opponentGoals === o)!;
  const goals = Array.from({ length: max + 1 }, (_, i) => i);
  const top = [...cells].sort((a, b) => b.p - a.p)[0];
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">
        Placar mais provável: <strong className="text-white">Leão {top.focusGoals} x {top.opponentGoals} {opponentName}</strong>{" "}
        ({pct(top.p)}). Quanto mais verde, maior a chance de subir com aquele placar.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="mx-auto border-separate border-spacing-1 text-center tabular">
          <caption className="sr-only">
            Chance de cada placar e chance de o Leão subir com ele (linhas: gols do Leão; colunas: gols do {opponentName})
          </caption>
          <thead>
            <tr>
              <th className="px-1 text-left text-xs font-semibold text-muted">
                Leão ↓<br />
                {opponentName} →
              </th>
              {goals.map((o) => (
                <th key={o} scope="col" className="w-14 text-sm font-semibold text-muted sm:w-16">
                  {o}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((f) => (
              <tr key={f}>
                <th scope="row" className="pr-1 text-sm font-semibold text-muted">
                  {f}
                </th>
                {goals.map((o) => {
                  const c = at(f, o);
                  return (
                    <td
                      key={o}
                      className="h-14 w-14 rounded-lg ring-1 ring-line sm:h-16 sm:w-16"
                      style={{ background: `color-mix(in srgb, var(--win) ${Math.round(c.pAdvance * 70)}%, var(--surface-2))` }}
                      title={`Leão ${f} x ${o}: ${pct(c.p)} de acontecer, ${pct(c.pAdvance)} de subir`}
                    >
                      <span className={`block text-base font-bold ${c.pAdvance > 0.6 ? "text-bg" : "text-white"}`}>
                        {pct(c.pAdvance)}
                      </span>
                      <span className={`block text-[11px] ${c.pAdvance > 0.6 ? "text-bg/80" : "text-muted"}`}>
                        {pct(c.p)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Em cada quadrado: em cima, a chance de subir com aquele placar; embaixo, a chance de o jogo terminar assim.
      </p>
    </div>
  );
}

function FinalResult() {
  if (!focus || !focusTie) return null;
  const played = focusTie.legs.map(legForFocus).filter((x): x is { f: number; o: number } => x !== null);
  const r = tieOutcome(focus.better, played);
  const opp = teamById[focus.opponentId].name;
  return (
    <div className="rounded-2xl bg-surface p-5 text-center ring-1 ring-line sm:p-6">
      <p className="text-sm font-semibold text-muted">Placar somado</p>
      <p className="font-display text-5xl leading-none">
        Fortaleza {r.f} x {r.o} {opp}
      </p>
      <p className={`mt-3 text-xl font-semibold ${r.advances ? "text-win" : ""}`}>
        {r.advances
          ? r.byTiebreak
            ? "Empate no placar somado: sobe o Leão, pela melhor campanha."
            : "O Leão está de volta à Série A!"
          : `Quem sobe é o ${opp}.`}
      </p>
    </div>
  );
}

function OtherTie({ tie }: { tie: PlayoffTie }) {
  const better = teamById[tie.betterId];
  const worse = teamById[tie.worseId];
  const decided = tie.winnerId != null;
  const rows = [
    { team: better, pos: tie.betterPosition, p: tie.pBetter },
    { team: worse, pos: tie.worsePosition, p: 1 - tie.pBetter },
  ];
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
      <h3 className="text-xl font-semibold">O outro confronto</h3>
      <p className="mt-1 text-sm text-muted">
        {better.name} x {worse.name}: o vencedor também sobe. Não há final entre os dois confrontos.
        {tie.aggregateBetter != null &&
          ` Placar somado: ${better.name} ${tie.aggregateBetter} x ${tie.aggregateWorse} ${worse.name}.`}
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map(({ team, pos, p }) => (
          <li key={team.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <MiniCrest team={team} />
            <div>
              <p className="font-semibold">
                {team.name} <span className="text-sm font-normal text-muted">({pos}º)</span>
              </p>
              <GrowBar value={p} color="var(--sky)" height="h-1.5" />
            </div>
            <span className="font-display text-2xl leading-none">
              {decided ? (tie.winnerId === team.id ? "Subiu" : "—") : advanceLabel(p, false)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

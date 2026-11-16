import { ShareButton } from "@/components/share/ShareButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FormDots } from "@/components/ui/FormDots";
import { fortalezaRow, playoffs, teamById, xray } from "@/lib/data";
import { plural } from "@/lib/format";
import { advanceLabel, focus, focusTie, legForFocus, rulePhrase, tieOutcome } from "@/lib/playoffs";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Card da esquerda do topo nos playoffs (gêmeo do "Próximo jogo"): o confronto, a chance de passar (= subir para a
 * Série A), o placar somado depois da ida e a regra em uma frase. Substitui as chances de acesso direto e de ir aos
 * playoffs, que já foram decididas.
 */
export function PlayoffHeroCard({ anchor }: { anchor: string }) {
  if (!focus || !focusTie || !playoffs) return null;
  const opp = teamById[focus.opponentId];
  const played = focusTie.legs.map(legForFocus).filter((x): x is { f: number; o: number } => x !== null);
  const agg = played.length ? tieOutcome(focus.better, played) : null;
  const finished = playoffs.state === "finished";
  const label = advanceLabel(focus.pAdvance);
  const num = /^\d+,\d%$/.test(label) ? (
    <AnimatedNumber value={parseFloat(label.replace(",", "."))} suffix="%" decimals={1} />
  ) : (
    label
  );
  const [pos1, pos2] = [focusTie.betterPosition, focusTie.worsePosition];

  return (
    <div className="flex min-w-0 flex-col justify-between gap-5 rounded-3xl bg-surface p-5 ring-1 ring-line sm:gap-6 sm:p-7">
      <h1 id={`${anchor}-title`} className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
          <span className="font-bold">Playoffs</span>
          <span className="sr-only"> da Série B: Fortaleza x {opp.name}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
          <span>
            {pos1}º x {pos2}º
          </span>
        </span>
      </h1>

      <div className="text-center">
        {finished ? (
          <p className="font-display text-[3.5rem] leading-[0.95] text-win sm:text-[4.5rem]">
            {focus.pAdvance >= 0.5 ? "Acesso garantido!" : "Não foi dessa vez"}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold sm:text-base">Chance de subir para a Série A</p>
            <p className="font-display text-[4.5rem] leading-[0.9] text-win min-[400px]:text-[5.25rem] sm:text-[6rem]">{num}</p>
            <p className="text-sm text-muted sm:text-base">
              de passar pel{opp.article === "a" ? "a" : "o"} {opp.name} no mata-mata
            </p>
          </>
        )}
      </div>

      {agg && (
        <div className="rounded-2xl bg-surface-2 p-4 text-center ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Placar somado {finished ? "final" : "depois da ida"}</p>
          <p className="mt-1 font-display text-4xl leading-none sm:text-5xl">
            Fortaleza {agg.f} x {agg.o} {opp.name}
          </p>
        </div>
      )}

      <div className="border-t border-line pt-4 text-center">
        <p className="text-[15px] text-white/90">{rulePhrase(focus.better, focus.opponentId)}</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>
            Pontos corridos: <strong className="text-white">{fortalezaRow.position}º</strong>, {plural(fortalezaRow.points, "ponto")}
          </span>
          <FormDots form={xray.streaks.form} size="sm" />
        </p>
      </div>

      <div className="flex justify-center">
        <ShareButton
          compact
          variant="outline"
          image="/api/card/acesso"
          fileName="fortaleza-chance-de-subir.png"
          link={SITE_URL}
          text={
            finished
              ? `Fortaleza x ${opp.name} nos playoffs da Série B, no ${SITE_NAME}.`
              : `Chance de o Fortaleza subir para a Série A passando pelo ${opp.name}, segundo o ${SITE_NAME}: ${label}.`
          }
        />
      </div>
    </div>
  );
}

/** Frase do topo nos playoffs. */
export const PLAYOFF_INTRO =
  "Aqui você acompanha o Fortaleza nos playoffs da Série B: a chance de subir, do que o Leão precisa em cada jogo e a história da campanha. Tudo se atualiza sozinho depois de cada jogo.";

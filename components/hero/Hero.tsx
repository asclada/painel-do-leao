import { NextMatchCard } from "@/components/hero/NextMatchCard";
import { ShareButton } from "@/components/share/ShareButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FormDots } from "@/components/ui/FormDots";
import { fortalezaOdds, fortalezaRow, FORTALEZA, meta, nextMatch, standings, xray } from "@/lib/data";
import { pct, pctNumber, plural } from "@/lib/format";
import { situation } from "@/lib/situation";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * F1 — "Como tá o Leão agora". Em 5 segundos: onde o time está e a chance de subir.
 * No celular (390×844) cabe inteiro sem rolar, com o próximo jogo.
 * Vermelho contido: só a chance de subir é vermelha (escolha do checkpoint visual 1).
 */
export function Hero({ anchor = "agora" }: { anchor?: string }) {
  const sit = situation(standings, FORTALEZA);
  const chance = pctNumber(fortalezaOdds.pPromotion);

  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="spotlight">
      <div className="mx-auto grid w-full max-w-[1100px] gap-5 px-4 pb-8 pt-4 sm:pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <h1 id={`${anchor}-title`} className="text-sm text-muted">
            Fortaleza na Série B · depois da rodada {meta.lastCompletedRound}
          </h1>

          <div className="mt-1 flex items-end gap-4">
            <p
              className={`font-display text-[7.5rem] leading-[0.85] sm:text-score text-white`}
              aria-label={`${fortalezaRow.position}º lugar`}
            >
              <AnimatedNumber value={fortalezaRow.position} suffix="º" />
            </p>
            <div className="pb-1">
              <p className="text-xl font-semibold leading-tight sm:text-2xl">{sit.title}</p>
              <p className="mt-1 text-sm text-muted sm:text-base">
                {plural(fortalezaRow.points, "ponto")} em {plural(fortalezaRow.played, "jogo")}
                <br />
                {sit.gap}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FormDots form={xray.streaks.form} />
            <span className="font-semibold">{xray.streaks.currentLabel}</span>
          </div>

          <div
            className="mt-5 flex items-end justify-between gap-3 border-l-4 border-red pl-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-muted sm:text-base">Chance de subir para a Série A</p>
              <p className="font-display text-[5.5rem] leading-[0.9] text-red sm:text-[6rem]">
                <AnimatedNumber value={chance} suffix="%" />
              </p>
              <p className="text-sm text-muted sm:text-base">
                Direto: <strong className="text-white">{pct(fortalezaOdds.pDirect)}</strong> · playoffs:{" "}
                <strong className="text-white">{pct(fortalezaOdds.pPlayoffPromotion)}</strong>
              </p>
            </div>
            <ShareButton
              compact
              variant="outline"
              image="/api/card/acesso"
              fileName="fortaleza-chance-de-acesso.png"
              link={SITE_URL}
              text={`O Fortaleza tem ${chance}% de chance de subir para a Série A, segundo o ${SITE_NAME}.`}
            />
          </div>
        </div>

        {nextMatch && (
          <div className="min-w-0 lg:pt-8">
            <NextMatchCard match={nextMatch} />
          </div>
        )}
      </div>
    </section>
  );
}

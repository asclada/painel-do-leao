import Image from "next/image";
import escudo from "@/assets/escudo-fortaleza.png";
import { NextMatchCard } from "@/components/hero/NextMatchCard";
import { ShareButton } from "@/components/share/ShareButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FormDots } from "@/components/ui/FormDots";
import { fortalezaOdds, fortalezaRow, FORTALEZA, nextMatch, standings, xray } from "@/lib/data";
import { chanceLabel, clinchBadge, statusOf } from "@/lib/clinch";
import { plural } from "@/lib/format";
import { situation } from "@/lib/situation";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * F1 — "Como tá o Leão agora". Em 5 segundos: onde o time está e a chance de subir.
 * No celular (390×844) cabe inteiro sem rolar, com o próximo jogo.
 * A chance de subir fica em verde, com o selo azul em destaque (pedido do Lucas, 29/09).
 * "Agora" (menu e nome do site) leva ao topo de verdade, com o campinho à vista: margem de rolagem maior que a
 * distância até o topo.
 */
export function Hero({ anchor = "agora" }: { anchor?: string }) {
  const sit = situation(standings, FORTALEZA);
  const st = statusOf(FORTALEZA);
  const chanceTxt = chanceLabel(fortalezaOdds.pPromotion, st.promotion);
  // número animado só quando é um percentual "normal"; ">99%"/"<1%" (sem certeza na matemática) vão como texto
  const plain = /^\d+%$/.test(chanceTxt);
  const badge = clinchBadge(FORTALEZA);

  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="spotlight scroll-mt-60">
      <div className="mx-auto grid w-full max-w-[1100px] gap-5 px-4 pb-8 pt-4 sm:pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="min-w-0">
          {/* Resumo do site para quem chega pelo link: o que é e para que serve, em uma frase */}
          <div className="mb-5 flex items-center gap-4">
            <Image
              src={escudo}
              alt="Escudo do Fortaleza Esporte Clube"
              loading="eager"
              className="h-16 w-auto shrink-0 sm:h-20"
            />
            <p className="text-[15px] leading-snug text-white/90 sm:text-base">
              Aqui você acompanha o Fortaleza na Série B: a posição na tabela, a chance de subir para a Série A e os
              jogos que faltam. Tudo se atualiza sozinho depois de cada rodada.
            </p>
          </div>
          <h1 id={`${anchor}-title`} className="text-sm text-muted">
            Situação atual na Série B · {plural(fortalezaRow.played, "jogo")}
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

          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              {/* selo no mesmo estilo do "Próximo jogo"; a chance vai em verde (pedido do Lucas, 29/09) */}
              <p className="inline-flex rounded-2xl bg-blue px-4 py-1.5 text-sm font-bold text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
                Chances aproximadas do Leão subir pra Série A
              </p>
              <p className="mt-4 font-display text-[5.5rem] leading-[0.9] text-win sm:text-[6rem]">
                {plain ? <AnimatedNumber value={parseInt(chanceTxt, 10)} suffix="%" /> : chanceTxt}
              </p>
              <p className="text-sm text-muted sm:text-base">
                Direto: <strong className="text-white">{chanceLabel(fortalezaOdds.pDirect, st.direct)}</strong> · playoffs:{" "}
                <strong className="text-white">{chanceLabel(fortalezaOdds.pPlayoffPromotion, st.playoffs)}</strong>
              </p>
              {badge && (
                <p
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                    badge.good ? "bg-win text-bg" : "bg-surface-2 text-white ring-1 ring-white/25"
                  }`}
                >
                  {badge.text}
                </p>
              )}
            </div>
            <ShareButton
              compact
              variant="outline"
              image="/api/card/acesso"
              fileName="fortaleza-chance-de-acesso.png"
              link={SITE_URL}
              text={`O Fortaleza tem ${chanceTxt} de chance de subir para a Série A, segundo o ${SITE_NAME}.`}
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

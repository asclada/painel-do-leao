import Image from "next/image";
import escudo from "@/assets/escudo-fortaleza.png";
import { NextMatchCard } from "@/components/hero/NextMatchCard";
import { ShareButton } from "@/components/share/ShareButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FormDots } from "@/components/ui/FormDots";
import { fortalezaOdds, fortalezaRow, FORTALEZA, nextMatch, standings, xray } from "@/lib/data";
import { accessChances, clinchBadge } from "@/lib/clinch";
import { plural } from "@/lib/format";
import { situation } from "@/lib/situation";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * F1 — "Como tá o Leão agora". Em 5 segundos: onde o time está e as chances de acesso.
 * As chances seguem o formato do GE (decisão do Lucas, 30/09): acesso direto em verde e ida aos playoffs ao lado,
 * com uma casa decimal, sob o selo azul em destaque.
 * "Agora" (menu e nome do site) leva ao topo de verdade, com o campinho à vista: margem de rolagem maior que a
 * distância até o topo.
 */
export function Hero({ anchor = "agora" }: { anchor?: string }) {
  const sit = situation(standings, FORTALEZA);
  const ch = accessChances(FORTALEZA, fortalezaOdds);
  const badge = clinchBadge(FORTALEZA);
  // número animado só quando é um percentual "normal" (37,6%); 100%, 0%, ">99,9%" e "<0,1%" vão como texto
  const num = (label: string) =>
    /^\d+,\d%$/.test(label) ? (
      <AnimatedNumber value={parseFloat(label.replace(",", "."))} suffix="%" decimals={1} />
    ) : (
      label
    );

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
              Aqui você acompanha o Fortaleza na Série B: a posição na tabela, as chances de acesso à Série A e os
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

          {/* no computador (lg+): playoffs embaixo do acesso direto e o compartilhar embaixo dos dois (pedido do Lucas,
              30/09); no celular, lado a lado como antes */}
          <div className="mt-6 flex items-end justify-between gap-3 lg:flex-col lg:items-start lg:gap-5">
            <div className="min-w-0">
              {/* selo no mesmo estilo do "Próximo jogo"; o acesso direto vai em verde */}
              <p className="inline-flex rounded-2xl bg-blue px-4 py-1.5 text-sm font-bold text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
                Chances do Leão na Série B
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 lg:grid-cols-1 lg:gap-y-4">
                <div>
                  <dt className="text-sm font-semibold sm:text-base">Acesso direto</dt>
                  <dd className="font-display text-[3.5rem] leading-[0.95] text-win min-[400px]:text-[4rem] sm:text-[5rem]">
                    {num(ch.direct)}
                  </dd>
                  <dd className="text-xs text-muted sm:text-sm">1º ou 2º lugar</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold sm:text-base">Ir aos playoffs</dt>
                  <dd className="font-display text-[3.5rem] leading-[0.95] min-[400px]:text-[4rem] sm:text-[5rem]">
                    {num(ch.playoffs)}
                  </dd>
                  <dd className="text-xs text-muted sm:text-sm">do 3º ao 6º lugar</dd>
                </div>
              </dl>
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
              text={`Chances do Fortaleza na Série B, segundo o ${SITE_NAME}: acesso direto ${ch.direct} e ir aos playoffs ${ch.playoffs}.`}
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

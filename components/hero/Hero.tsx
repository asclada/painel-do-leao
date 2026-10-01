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
 * Dois cards gêmeos (opção B, escolhida pelo Lucas em 01/10): "Situação atual" e "Próximo jogo", com o mesmo fundo,
 * o mesmo selo azul no alto e a mesma altura no computador; a frase de apresentação fica numa faixa acima dos dois.
 * As chances seguem o formato do GE (decisão do Lucas, 30/09): acesso direto em verde e ida aos playoffs ao lado,
 * com uma casa decimal.
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
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-8 pt-4 sm:pt-10">
        {/* Resumo do site para quem chega pelo link: o que é e para que serve, em uma frase */}
        <div className="mb-5 flex items-center gap-4">
          <Image
            src={escudo}
            alt="Escudo do Fortaleza Esporte Clube"
            loading="eager"
            className="h-16 w-auto shrink-0 sm:h-20"
          />
          <p className="max-w-2xl text-[15px] leading-snug text-white/90 sm:text-base">
            Aqui você acompanha o Fortaleza na Série B: a posição na tabela, as chances de acesso à Série A e os
            jogos que faltam. Tudo se atualiza sozinho depois de cada rodada.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          {/* mesma altura do card ao lado: a sobra se divide por igual entre os blocos (justify-between), sem buraco
              acima do "Compartilhar" (pedido do Lucas, 01/10) */}
          <div className="flex min-w-0 flex-col justify-between gap-5 rounded-3xl bg-surface p-5 ring-1 ring-line sm:gap-6 sm:p-7">
            {/* selo no mesmo estilo do "Próximo jogo" */}
            <h1 id={`${anchor}-title`} className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20 sm:text-base">
                <span className="font-bold">Situação atual</span>
                <span className="sr-only"> na Série B</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
                <span>{plural(fortalezaRow.played, "rodada")}</span>
              </span>
            </h1>

            <div>
              <div className="flex items-center justify-center gap-4">
                <p
                  className="font-display text-[5.5rem] leading-[0.85] text-white sm:text-[6.5rem]"
                  aria-label={`${fortalezaRow.position}º lugar`}
                >
                  <AnimatedNumber value={fortalezaRow.position} suffix="º" />
                </p>
                <div>
                  <p className="text-xl font-semibold leading-tight sm:text-2xl">{sit.title}</p>
                  <p className="mt-1 text-lg font-bold leading-tight text-white sm:text-xl">
                    {plural(fortalezaRow.points, "ponto")}
                  </p>
                  <p className="text-sm text-muted sm:text-base">{sit.gap}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <FormDots form={xray.streaks.form} />
                <span className="font-semibold">{xray.streaks.currentLabel}</span>
              </div>
            </div>

            {/* mesmo desenho do "Chances do Leão neste jogo" do card ao lado */}
            <div className="border-t border-line pt-4">
              <p className="text-center text-sm font-semibold text-muted">Chances do Leão na Série B</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-center">
                <div>
                  <dt className="text-sm font-semibold sm:text-base">Acesso direto</dt>
                  <dd className="font-display text-[3.25rem] leading-[0.95] text-win min-[400px]:text-[3.75rem] sm:text-[4.25rem]">
                    {num(ch.direct)}
                  </dd>
                  <dd className="text-xs text-muted sm:text-sm">1º ou 2º lugar</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold sm:text-base">Ir aos playoffs</dt>
                  <dd className="font-display text-[3.25rem] leading-[0.95] min-[400px]:text-[3.75rem] sm:text-[4.25rem]">
                    {num(ch.playoffs)}
                  </dd>
                  <dd className="text-xs text-muted sm:text-sm">do 3º ao 6º lugar</dd>
                </div>
              </dl>
              {badge && (
                <p className="mt-3 flex justify-center">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                      badge.good ? "bg-win text-bg" : "bg-surface-2 text-white ring-1 ring-white/25"
                    }`}
                  >
                    {badge.text}
                  </span>
                </p>
              )}
            </div>

            {/* no rodapé do card, alinhado com o "Dê seu palpite" do card ao lado */}
            <div className="flex justify-center">
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
            <div className="min-w-0">
              <NextMatchCard match={nextMatch} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

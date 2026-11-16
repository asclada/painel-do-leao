"use client";

import { useState } from "react";
import { RetroChart, type RetroMark, type RetroPoint } from "@/components/playoffs/RetroChart";
import { ShareButton } from "@/components/share/ShareButton";
import type { Retro } from "@/lib/generated/outputs";

/**
 * Retrospectiva dos pontos corridos: a chance de terminar no G6 rodada a rodada e os momentos que contam a história
 * (largada, pior momento, troca de técnico, sequência invicta, vaga garantida, maior vitória, fim). Os textos vêm do
 * pipeline (pipeline/calc/retro.py).
 */
export function Retrospective({
  retro,
  points,
  siteUrl,
  shareText,
}: {
  retro: Retro;
  points: RetroPoint[];
  siteUrl: string;
  shareText: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const marks: RetroMark[] = retro.moments.map((m, i) => ({ n: i + 1, round: m.round, title: m.title }));
  const stats = [
    { big: `${retro.bestPosition}º`, label: `melhor posição (rodada ${retro.bestPositionRound})` },
    { big: `${retro.worstPosition}º`, label: `pior posição da rodada 10 em diante (rodada ${retro.worstPositionRound})` },
    { big: String(retro.roundsInG6), label: `das ${retro.rounds} rodadas dentro do G6` },
    { big: String(retro.longestUnbeaten), label: "jogos seguidos sem perder" },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <dt className="sr-only">{s.label}</dt>
            <dd className="font-display text-5xl leading-none">{s.big}</dd>
            <dd className="mt-1 text-sm text-muted">{s.label}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="self-start rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
          <h3 className="text-sm font-semibold text-muted">Chance de terminar no G6, depois de cada rodada</h3>
          <div
            className="mt-3"
            role="img"
            aria-label={`Gráfico da chance de o Fortaleza terminar no G6 rodada a rodada, de ${Math.round(100 * points[0].p)}% na rodada ${points[0].round} a ${Math.round(100 * points.at(-1)!.p)}% na rodada ${points.at(-1)!.round}.`}
          >
            <RetroChart points={points} marks={marks} active={active} onActive={setActive} />
          </div>
          <p className="mt-2 text-xs text-muted">
            A conta refeita depois de cada rodada, só com os jogos disputados até ali. Toque nos números para ver cada
            momento.
          </p>
        </div>

        <ol className="space-y-2">
          {retro.moments.map((m, i) => (
            <li key={`${m.kind}-${m.round}`}>
              <button
                type="button"
                onClick={() => setActive(active === i + 1 ? null : i + 1)}
                onMouseEnter={() => setActive(i + 1)}
                className={`flex w-full gap-3 rounded-2xl p-3 text-left ring-1 transition-colors ${
                  active === i + 1 ? "bg-surface-2 ring-white/40" : "bg-surface ring-line hover:bg-surface-2"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    active === i + 1 ? "bg-white text-bg" : "bg-blue text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-white/80">{m.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex justify-center">
        <ShareButton
          image="/api/card/retrospectiva"
          fileName="fortaleza-retrospectiva.png"
          link={siteUrl}
          text={shareText}
        />
      </div>
    </div>
  );
}

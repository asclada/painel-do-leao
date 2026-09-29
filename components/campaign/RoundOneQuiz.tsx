"use client";

import { ArrowDown, Check, X } from "lucide-react";
import { useState } from "react";

type Zone = "g6" | "mid" | "z4";

const OPTIONS: { zone: Zone; label: string }[] = [
  { zone: "g6", label: "No G6" },
  { zone: "mid", label: "No meio da tabela" },
  { zone: "z4", label: "Na zona de rebaixamento" },
];

function zoneOf(position: number): Zone {
  return position <= 6 ? "g6" : position <= 16 ? "mid" : "z4";
}

/**
 * "Você lembra onde o Leão estava na rodada 1?" — chute em uma das três faixas e toque para revelar.
 * A resposta vem de data/timeline.json (sempre a rodada 1 real); a revelação leva para a montanha-russa.
 */
export function RoundOneQuiz({
  position,
  score,
  nowPosition,
}: {
  position: number;
  score: string; // "Fortaleza 1 x 0 CRB"
  nowPosition: number;
}) {
  const [guess, setGuess] = useState<Zone | null>(null);
  const answer = zoneOf(position);
  const right = guess === answer;

  return (
    <div className="mt-6 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
      <h3 className="text-xl font-semibold">Você lembra onde o Leão estava depois da rodada 1?</h3>
      {guess === null ? (
        <>
          <p className="mt-1 text-sm text-muted">Chute e toque para ver a resposta.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.zone}
                type="button"
                onClick={() => setGuess(o.zone)}
                className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-semibold ring-1 ring-line hover:bg-white/15"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div aria-live="polite">
          <p className="mt-3 inline-flex items-center gap-2 font-semibold">
            {right ? (
              <>
                <Check size={18} className="text-win" aria-hidden /> Acertou!
              </>
            ) : (
              <>
                <X size={18} className="text-loss" aria-hidden /> Não foi dessa vez.
              </>
            )}
          </p>
          <p className="mt-2 flex items-end gap-3">
            <span className="font-display text-6xl leading-none">{position}º</span>
            <span className="pb-1 text-white/90">
              depois de {score}. Hoje o Leão é o {nowPosition}º.
            </span>
          </p>
          <a
            href="#temporada"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-bg hover:bg-white/90"
          >
            Ver a temporada inteira <ArrowDown size={16} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}

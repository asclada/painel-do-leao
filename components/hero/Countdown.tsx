"use client";

import { useNow } from "@/lib/useNow";

const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

function parts(ms: number) {
  const m = Math.floor(ms / 60000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), min: m % 60 };
}

/** Contagem regressiva até o jogo; vira "Bola rolando agora!" durante a partida. */
export function Countdown({ kickoffUtc }: { kickoffUtc: string }) {
  const now = useNow();
  if (now === null) return <span className="block h-8" aria-hidden />;
  const diff = new Date(kickoffUtc).getTime() - now;

  if (diff <= 0 && -diff < LIVE_WINDOW_MS) {
    return (
      <span className="inline-flex items-center gap-2 font-semibold">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red" aria-hidden />
        Bola rolando agora!
      </span>
    );
  }
  if (diff <= 0) return <span className="text-muted">Jogo encerrado. O resultado entra na próxima atualização.</span>;

  const { d, h, min } = parts(diff);
  const units = [
    [d, "dia", "dias"],
    [h, "h", "h"],
    [min, "min", "min"],
  ] as const;
  return (
    <span className="flex items-baseline gap-3" aria-label={`Faltam ${d} dias, ${h} horas e ${min} minutos`}>
      <span className="text-muted">Faltam</span>
      {units.map(([n, s, p]) => (
        <span key={s} className="tabular">
          <span className="font-display text-[1.75rem] leading-none">{n}</span>{" "}
          <span className="text-sm text-muted">{n === 1 ? s : p}</span>
        </span>
      ))}
    </span>
  );
}

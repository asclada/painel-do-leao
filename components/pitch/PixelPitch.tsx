"use client";

import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PixelPitchEngine } from "@/lib/pixel-pitch";

// Preferência do torcedor (pausado/rodando) lembrada no aparelho; sem escolha, segue o "reduzir movimento".
const PREF_KEY = "fen:campinho";
const listeners = new Set<() => void>();

function readPaused() {
  let pref: string | null = null;
  try {
    pref = localStorage.getItem(PREF_KEY);
  } catch {
    pref = null;
  }
  if (pref) return pref === "pausado";
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setPausedPref(paused: boolean) {
  try {
    localStorage.setItem(PREF_KEY, paused ? "pausado" : "rodando");
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  memo = paused;
  listeners.forEach((l) => l());
}

// sem armazenamento, a escolha vale enquanto a aba estiver aberta
let memo: boolean | null = null;
const getPaused = () => memo ?? readPaused();

/**
 * Faixa de gramado no início da página com jogadores pixel art tocando bola (pedido do Lucas, 30/09: opção A,
 * sem acompanhar a rolagem). O motor (lib/pixel-pitch.ts) só carrega depois que a página já apareceu.
 */
export function PixelPitch({ celebrate }: { celebrate: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<PixelPitchEngine | null>(null);
  const paused = useSyncExternalStore(subscribe, getPaused, () => false);
  const [closed, setClosed] = useState(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    engine.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      import("@/lib/pixel-pitch").then(({ PixelPitchEngine }) => {
        if (!alive || !host.current) return;
        engine.current = new PixelPitchEngine(host.current, { scale: 2, paused: pausedRef.current, celebrate });
      });
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(load, { timeout: 2500 })
      : window.setTimeout(load, 1200);
    return () => {
      alive = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      engine.current?.destroy();
      engine.current = null;
    };
  }, [celebrate]);

  if (closed) return null;

  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg/75 text-white hover:bg-bg focus-visible:outline-2 focus-visible:outline-white";
  return (
    <div className="mx-auto w-full max-w-[1100px] sm:px-4 sm:pt-3">
      <div
        ref={host}
        role="img"
        aria-label="Animação: jogadores com a camisa tricolor tocando bola num campinho"
        className="pitch-strip relative h-12 overflow-hidden sm:h-14 sm:rounded-xl"
      >
        {celebrate && !paused && (
          <span className="pitch-flag pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-lg bg-win px-2 py-0.5 text-xs font-extrabold text-bg">
            Vitória do Leão!
          </span>
        )}
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
          <button
            type="button"
            className={btn}
            onClick={() => setPausedPref(!paused)}
            aria-label={paused ? "Continuar a animação do campinho" : "Pausar a animação do campinho"}
          >
            {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              engine.current?.destroy();
              engine.current = null;
              setClosed(true);
            }}
            aria-label="Fechar o campinho"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

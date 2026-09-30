"use client";

// Palpites guardados no aparelho (localStorage), lidos com useSyncExternalStore: no servidor e na hidratação o
// valor é null (a página funciona sem armazenamento; só não lembra os palpites).
import { useSyncExternalStore } from "react";
import { decodeGuesses, encodeGuesses, type Guess, STORAGE_KEY } from "@/lib/palpite";

const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cache: Guess[] = [];
// sem armazenamento, os palpites valem até fechar a aba
let memory: Guess[] | null = null;

function read(): Guess[] {
  if (memory) return memory;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  // mesmo texto, mesmo objeto (o useSyncExternalStore exige um valor estável)
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = decodeGuesses(raw);
  }
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Grava os palpites; devolve false se o navegador não deixou (aba anônima cheia, armazenamento bloqueado...). */
export function saveGuesses(guesses: Guess[]): boolean {
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, encodeGuesses(guesses));
  } catch {
    ok = false;
  }
  memory = ok ? null : guesses;
  listeners.forEach((l) => l());
  return ok;
}

/** Palpites do aparelho; null antes de o navegador responder (servidor e hidratação). */
export function useGuesses(): Guess[] | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

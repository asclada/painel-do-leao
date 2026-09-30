"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";

const NAV = [
  ["agora", "Agora"],
  ["palpite", "Rodada"],
  ["corrida", "Corrida"],
  ["simulador", "Simulador"],
  ["campanha", "Campanha"],
  ["chance", "Números"],
  ["meu-leao", "Compartilhar"],
] as const;

export function Header({ name, updatedAt }: { name: string; updatedAt: string | null }) {
  const now = useNow();
  const ago = now !== null && updatedAt ? relativeTime(updatedAt, now) : null;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${scrolled ? "bg-bg/80 backdrop-blur-md" : "bg-bg"}`}
    >
      <div className="tricolor h-1" aria-hidden />
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-3">
        <a href="#agora" className="font-display text-2xl leading-none tracking-wide">
          {name}
        </a>
        <p className="text-right text-xs text-muted" aria-live="polite">
          {ago ? `Atualizado ${ago}` : " "}
        </p>
      </div>
      <nav aria-label="Seções" className="mx-auto max-w-[1100px]">
        <ul className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full bg-surface px-4 text-sm ring-1 ring-line hover:bg-surface-2"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

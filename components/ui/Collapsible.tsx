"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { warmUpWhenNear } from "@/lib/simulator-client";

/**
 * Seção recolhida (30/09, pedido do Lucas: menos informação de cara). Um card inteiro clicável, com uma frase do que
 * tem dentro e um botão escrito ("Ver a corrida completa"), para ninguém confundir com enfeite. Como no LazyDetails,
 * o conteúdo só é montado na primeira vez que o torcedor abre: a página fica mais leve para carregar e hidratar.
 *
 * Abre sozinho quando a página chega por um link para esta seção (#id na carga, por exemplo o "Minha previsão" ou o
 * Desafio do Leão, que caem em #simulador) ou com algum dos parâmetros de `openOnParams` na URL. Clicar no menu não
 * abre: leva só até o card.
 */
export function Collapsible({
  cta,
  description,
  children,
  openOnHash,
  openOnParams = [],
  warmSimulator = false,
  className = "",
}: {
  cta: string;
  description?: ReactNode;
  children: ReactNode;
  openOnHash?: string;
  openOnParams?: string[];
  /** aquece a função Python do simulador quando o card chega perto da tela (a primeira conta não demora) */
  warmSimulator?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const params = new URLSearchParams(window.location.search);
    if ((openOnHash && window.location.hash === `#${openOnHash}`) || openOnParams.some((p) => params.has(p))) {
      el.open = true;
    }
    // tocou antes da hidratação: o "toggle" passou antes do React; monta o conteúdo agora
    if (el.open) setOpened(true);
    return warmSimulator ? warmUpWhenNear(el) : undefined;
    // só na carga da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <details
      ref={ref}
      className={`group/col ${className}`}
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-4 rounded-3xl bg-surface p-5 ring-1 ring-line transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:p-6 [&::-webkit-details-marker]:hidden">
        {description && <span className="max-w-2xl text-base text-white/90 sm:text-lg">{description}</span>}
        <span className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-blue px-6 font-semibold text-white ring-1 ring-white/20 sm:self-auto">
          <span className="group-open/col:hidden">{cta}</span>
          <span className="hidden group-open/col:inline">Recolher</span>
          <ChevronDown size={20} className="transition-transform group-open/col:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="mt-6">{opened && children}</div>
    </details>
  );
}

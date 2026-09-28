"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

const STYLES = {
  solid: "bg-red text-white hover:bg-[#c81727]",
  light: "bg-white text-bg hover:bg-white/90",
  outline: "bg-transparent text-white ring-1 ring-white/40 hover:bg-white/10",
} as const;

/**
 * Compartilhar. Por enquanto compartilha o link; no Dia 3 passa a gerar a imagem
 * de story (F6) e enviar como arquivo pelo menu nativo do celular.
 */
export function ShareButton({
  text,
  variant = "solid",
  compact = false,
}: {
  text: string;
  variant?: keyof typeof STYLES;
  /** no celular vira só o ícone (o texto fica para leitores de tela) */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* o usuário fechou o menu de compartilhar */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${compact ? "sm:px-4" : "px-4"} ${STYLES[variant]}`}
    >
      {copied ? <Check size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
      <span aria-live="polite" className={compact ? "sr-only sm:not-sr-only" : ""}>
        {copied ? "Link copiado" : "Compartilhar"}
      </span>
    </button>
  );
}

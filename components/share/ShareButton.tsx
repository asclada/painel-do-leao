"use client";

import { Check, Link2, LoaderCircle, Share2, X } from "lucide-react";
import { useRef, useState } from "react";
import { trackUsage, type UsageEvent } from "@/lib/track";

const STYLES = {
  solid: "bg-red text-white hover:bg-[#c81727]",
  light: "bg-white text-bg hover:bg-white/90",
  outline: "bg-transparent text-white ring-1 ring-white/40 hover:bg-white/10",
} as const;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" } // imagem pronta, mas o navegador pediu um novo toque para abrir o menu
  | { kind: "saved" } // sem menu nativo: a imagem foi baixada
  | { kind: "copied" }
  | { kind: "error" };

/**
 * Compartilhar (F6). Com Web Share API e suporte a arquivos, envia o PNG do card
 * pelo menu nativo do celular (WhatsApp, Instagram...). Sem suporte, baixa a imagem
 * e oferece "Copiar link".
 */
export function ShareButton({
  text,
  image,
  fileName = "fortaleza-em-numeros.png",
  link,
  label = "Compartilhar",
  variant = "solid",
  compact = false,
  disabled = false,
  event,
}: {
  text: string;
  /** caminho do card PNG (ex.: /api/card/acesso) */
  image?: string;
  fileName?: string;
  /** link que vai junto; padrão: a página inicial */
  link?: string;
  label?: string;
  variant?: keyof typeof STYLES;
  /** no celular vira só o ícone (o texto fica para leitores de tela) */
  compact?: boolean;
  disabled?: boolean;
  /** evento de uso contado no toque (padrão: "cartao_gerado" com o nome do arquivo do card) */
  event?: UsageEvent;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const file = useRef<{ src: string; promise: Promise<File> } | null>(null);

  const shareUrl = () => link ?? window.location.origin;

  // Começa a gerar a imagem no primeiro sinal de intenção (dedo encostou, foco, mouse em cima)
  function prefetch() {
    if (!image || file.current?.src === image) return;
    const src = image;
    const promise = fetch(src).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new File([await r.blob()], fileName, { type: "image/png" });
    });
    promise.catch(() => {
      if (file.current?.src === src) file.current = null;
    });
    file.current = { src, promise };
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setStatus({ kind: "copied" });
      setTimeout(() => setStatus((s) => (s.kind === "copied" ? { kind: "idle" } : s)), 3000);
    } catch {
      setStatus({ kind: "error" });
    }
  }

  async function shareFile(f: File) {
    const data: ShareData = { files: [f], text: `${text} ${shareUrl()}` };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        setStatus({ kind: "idle" });
      } catch (e) {
        const name = (e as Error).name;
        if (name === "AbortError") setStatus({ kind: "idle" }); // fechou o menu
        else if (name === "NotAllowedError") setStatus({ kind: "ready" }); // demorou: pede outro toque
        else download(f);
      }
      return;
    }
    download(f);
  }

  function download(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setStatus({ kind: "saved" });
  }

  async function onClick() {
    const ev = event ?? (image ? { name: "cartao_gerado" as const, tipo: fileName.replace(/\.png$/, "") } : null);
    if (ev) trackUsage(ev);
    if (!image) {
      // só o link (sem imagem)
      if (navigator.share) {
        try {
          await navigator.share({ text, url: shareUrl() });
        } catch {
          /* fechou o menu */
        }
        return;
      }
      return copyLink();
    }
    prefetch();
    setStatus({ kind: "loading" });
    try {
      const f = await file.current!.promise;
      await shareFile(f);
    } catch {
      setStatus({ kind: "error" });
    }
  }

  async function shareAgain() {
    const f = await file.current?.promise.catch(() => null);
    if (f) await shareFile(f);
  }

  const busy = status.kind === "loading";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={prefetch}
        onPointerDown={prefetch}
        onFocus={prefetch}
        disabled={disabled || busy}
        aria-busy={busy}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "sm:px-4" : "px-5"} ${STYLES[variant]}`}
      >
        {busy ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden />
        ) : (
          <Share2 size={18} aria-hidden />
        )}
        <span className={compact ? "sr-only sm:not-sr-only" : ""}>{busy ? "Preparando imagem…" : label}</span>
      </button>

      <div aria-live="polite">
        {status.kind !== "idle" && status.kind !== "loading" && (
          <div
            role="status"
            className="fixed inset-x-4 top-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-white p-4 text-sm text-bg shadow-2xl"
          >
            <div className="min-w-0 flex-1">
              {status.kind === "ready" && (
                <>
                  <p className="font-semibold">Imagem pronta!</p>
                  <button type="button" onClick={shareAgain}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-red px-4 font-semibold text-white">
                    <Share2 size={16} aria-hidden /> Compartilhar agora
                  </button>
                </>
              )}
              {status.kind === "saved" && (
                <>
                  <p className="font-semibold">Imagem salva! Agora é só postar.</p>
                  <button type="button" onClick={copyLink}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-bg px-4 font-semibold text-white">
                    <Link2 size={16} aria-hidden /> Copiar link
                  </button>
                </>
              )}
              {status.kind === "copied" && (
                <p className="inline-flex items-center gap-2 font-semibold">
                  <Check size={16} aria-hidden /> Link copiado. É só colar na conversa.
                </p>
              )}
              {status.kind === "error" && (
                <>
                  <p className="font-semibold">Não deu para gerar a imagem agora.</p>
                  <button type="button" onClick={copyLink}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-bg px-4 font-semibold text-white">
                    <Link2 size={16} aria-hidden /> Copiar link
                  </button>
                </>
              )}
            </div>
            <button type="button" onClick={() => setStatus({ kind: "idle" })} aria-label="Fechar aviso"
              className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-bg/10">
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

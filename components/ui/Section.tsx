import type { ReactNode } from "react";

/**
 * Seção com âncora, título em frase normal e a frase de destaque logo abaixo.
 * `eyebrow` abre um bloco da página ("Esta rodada", "A briga pelo acesso"...) com um rótulo pequeno acima do título;
 * `quiet` é o visual discreto do bloco "Para quem gosta de números" (título menor, menos espaço).
 */
export function Section({
  id,
  title,
  headline,
  children,
  className = "",
  lazyRender = true,
  eyebrow,
  quiet = false,
}: {
  id: string;
  title: string;
  headline?: string;
  children: ReactNode;
  className?: string;
  /** o navegador só desenha a seção quando ela chega perto da tela (desligar se houver algo "fixed" dentro) */
  lazyRender?: boolean;
  eyebrow?: string;
  quiet?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`mx-auto w-full max-w-[1100px] px-4 ${quiet ? "py-10 sm:py-14" : "py-14 sm:py-20"} ${lazyRender ? "cv-auto" : ""} ${className}`}
    >
      {eyebrow && (
        <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:mb-6">
          <span className="tricolor h-1 w-8 rounded-full" aria-hidden />
          {eyebrow}
        </p>
      )}
      <h2
        id={`${id}-title`}
        className={`font-display leading-none ${quiet ? "text-[2rem] text-white/85 sm:text-[2.75rem]" : "text-[2.5rem] sm:text-[4rem]"}`}
      >
        {title}
      </h2>
      {headline && (
        <p className={`mt-3 max-w-2xl ${quiet ? "text-base text-muted sm:text-lg" : "text-lg text-white/90 sm:text-xl"}`}>
          {headline}
        </p>
      )}
      <div className={quiet ? "mt-6" : "mt-8"}>{children}</div>
    </section>
  );
}

import type { ReactNode } from "react";

/** Seção com âncora, título em frase normal e a frase de destaque logo abaixo. */
export function Section({
  id,
  title,
  headline,
  children,
  className = "",
}: {
  id: string;
  title: string;
  headline?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`mx-auto w-full max-w-[1100px] px-4 py-14 sm:py-20 ${className}`}>
      <h2 id={`${id}-title`} className="font-display text-[2.5rem] leading-none sm:text-[4rem]">
        {title}
      </h2>
      {headline && <p className="mt-3 max-w-2xl text-lg text-white/90 sm:text-xl">{headline}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

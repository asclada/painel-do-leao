"use client";

import { type ReactNode, useState } from "react";

/**
 * `<details>` que só monta o conteúdo quando o torcedor abre o bloco pela primeira vez (depois fica montado).
 * Os blocos recolhidos ("Jogo a jogo", detalhes da corrida, "Ver os outros jogos"...) eram mais da metade do HTML da
 * página e atrasavam a primeira tela em celular fraco. O conteúdo e o visual são os mesmos de antes; `summary` é o
 * próprio elemento `<summary>`, que continua sempre na página.
 */
export function LazyDetails({
  summary,
  children,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details className={className} onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      {summary}
      {opened && children}
    </details>
  );
}

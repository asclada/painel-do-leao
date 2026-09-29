"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { pct, pctNumber } from "@/lib/format";

/**
 * Percentual que desliza do valor anterior para o novo (resposta a um clique).
 * Diferente do AnimatedNumber, não conta do zero ao montar.
 */
export function TweenPct({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const from = prev.current;
    prev.current = value;
    if (!el || reduce || from === value) {
      if (el) el.textContent = pct(value);
      return;
    }
    const controls = animate(pctNumber(from), pctNumber(value), {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${Math.round(v)}%`;
      },
      onComplete: () => {
        el.textContent = pct(value);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className="tabular">
      {pct(value)}
    </span>
  );
}

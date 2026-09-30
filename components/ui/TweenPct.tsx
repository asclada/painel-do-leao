"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { pct1 } from "@/lib/format";

/**
 * Percentual que desliza do valor anterior para o novo (resposta a um clique).
 * Diferente do AnimatedNumber, não conta do zero ao montar. Uma casa decimal, como as chances do topo ("37,6%").
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
      if (el) el.textContent = pct1(value);
      return;
    }
    const controls = animate(from * 100, value * 100, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${v.toFixed(1).replace(".", ",")}%`;
      },
      onComplete: () => {
        el.textContent = pct1(value);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className="tabular">
      {pct1(value)}
    </span>
  );
}

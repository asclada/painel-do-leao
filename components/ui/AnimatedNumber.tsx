"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

const fmt = (v: number, decimals: number) => v.toFixed(decimals).replace(".", ",");

/**
 * Número que "conta" do zero até o valor (o único momento orquestrado da página).
 * O valor final já vem no HTML (SSR); a animação só roda no cliente e respeita
 * prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  suffix = "",
  duration = 1.2,
  animateOnChange = false,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  animateOnChange?: boolean;
  /** casas decimais, com vírgula (37,6) */
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const controls = animate(from.current, value, {
      duration: animateOnChange && from.current !== 0 ? 0.5 : duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${fmt(v, decimals)}${suffix}`;
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, suffix, duration, reduce, animateOnChange, decimals]);

  return (
    <span ref={ref} className="tabular">
      {fmt(value, decimals)}
      {suffix}
    </span>
  );
}

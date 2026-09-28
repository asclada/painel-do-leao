"use client";

import { useEffect, useRef, useState } from "react";

/** Barra horizontal que cresce quando entra na tela (uma vez). */
export function GrowBar({
  value,
  color = "var(--red)",
  track = "rgb(168 180 216 / 0.14)",
  height = "h-2.5",
  label,
}: {
  value: number; // 0..1
  color?: string;
  track?: string;
  height?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`w-full overflow-hidden rounded-full ${height}`} style={{ background: track }}
      role={label ? "img" : undefined} aria-label={label}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: shown ? `${Math.max(0, Math.min(1, value)) * 100}%` : "0%", background: color }}
      />
    </div>
  );
}

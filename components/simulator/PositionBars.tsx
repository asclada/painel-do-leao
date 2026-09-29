import { pct } from "@/lib/format";

function zoneColor(pos: number) {
  if (pos <= 2) return "var(--white)";
  if (pos <= 6) return "var(--sky)";
  return "rgb(168 180 216 / 0.35)";
}

/** Mini gráfico: chance de terminar em cada posição (1º a 20º), com G2 e G6 destacados. */
export function PositionBars({ dist, best }: { dist: number[]; best: number }) {
  const max = Math.max(...dist, 0.0001);
  const top = dist
    .map((p, i) => ({ pos: i + 1, p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .filter((x) => x.p > 0);
  const label = `Chance de terminar em cada posição. Mais prováveis: ${top.map((x) => `${x.pos}º, ${pct(x.p)}`).join("; ")}.`;

  return (
    <div role="img" aria-label={label}>
      <div className="flex h-16 items-end gap-[3px]" aria-hidden>
        {dist.map((p, i) => {
          const pos = i + 1;
          return (
            <div key={pos} className="relative flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-t-[2px] transition-[height] duration-500 ease-out ${pos === best ? "outline-1 outline-offset-1 outline-white" : ""}`}
                style={{ height: p > 0 ? `max(${(p / max) * 100}%, 2px)` : "0", background: zoneColor(pos) }}
              />
              {pos === 6 && <span className="absolute -right-[2.5px] bottom-0 h-full w-px bg-white/25" />}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex text-[11px] text-muted tabular" aria-hidden>
        <span className="flex-[2]">1º</span>
        <span className="flex-[4]">G6</span>
        <span className="flex-[13]" />
        <span className="flex-1 text-right">20º</span>
      </div>
    </div>
  );
}

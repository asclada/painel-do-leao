import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA, teamById, timeline } from "@/lib/data";
import { plural, shortDate } from "@/lib/format";

const RESULT = {
  V: { label: "Vitória", cls: "bg-win text-bg" },
  E: { label: "Empate", cls: "bg-draw text-bg" },
  D: { label: "Derrota", cls: "bg-loss text-white" },
} as const;

/** Jogo a jogo: a campanha completa na Série B (recolhida por padrão, abaixo da montanha-russa). */
export function MatchList() {
  const played = timeline.points.filter((p) => p.result && p.opponentId);
  if (played.length === 0) return null;
  const fort = teamById[FORTALEZA];

  return (
    <details className="group mt-8 rounded-2xl bg-surface ring-1 ring-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
        Jogo a jogo: os {plural(played.length, "jogo")} da campanha
        <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ol className="divide-y divide-line border-t border-line">
        {played.map((p) => {
          const opp = teamById[p.opponentId!];
          const src = crestSrc(opp.id);
          const [home, away] = p.home ? [fort, opp] : [opp, fort];
          const [hg, ag] = p.home ? [p.goalsFor, p.goalsAgainst] : [p.goalsAgainst, p.goalsFor];
          const r = RESULT[p.result!];
          return (
            <li key={p.round} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="w-12 shrink-0 text-xs leading-tight text-muted tabular">
                R{p.round}
                {p.kickoffUtc && <span className="block">{shortDate(p.kickoffUtc)}</span>}
              </span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                {src ? (
                  <Image src={src} alt="" fill sizes="32px" className="object-contain" />
                ) : (
                  <TeamBadge team={opp} size="sm" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold sm:text-base">{opp.name}</span>
                <span className="block text-xs text-muted">
                  <span className="text-white tabular">
                    Fortaleza {p.goalsFor} x {p.goalsAgainst}
                  </span>{" "}
                  · {p.home ? "em casa" : "fora de casa"}
                </span>
                <span className="sr-only">
                  {home.name} {hg} x {ag} {away.name}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${r.cls}`}>
                <span className="sm:hidden" aria-hidden>{p.result}</span>
                <span className="max-sm:sr-only">{r.label}</span>
              </span>
              <span className="w-12 shrink-0 text-right text-sm tabular">
                <strong>{p.points}</strong> <span className="text-xs text-muted">pts</span>
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

import { ChevronDown } from "lucide-react";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { MiniCrest } from "@/components/ui/MiniCrest";
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
    <LazyDetails
      className="group mt-8 rounded-2xl bg-surface ring-1 ring-line"
      summary={
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
          Jogo a jogo: os {plural(played.length, "jogo")} da campanha
          <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
      }
    >
      <ol className="divide-y divide-line border-t border-line">
        {played.map((p) => {
          const opp = teamById[p.opponentId!];
          const [home, away] = p.home ? [fort, opp] : [opp, fort];
          const [hg, ag] = p.home ? [p.goalsFor, p.goalsAgainst] : [p.goalsAgainst, p.goalsFor];
          const r = RESULT[p.result!];
          return (
            <li key={p.round} className="px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span className="tabular">
                  Rodada {p.round}
                  {p.kickoffUtc && ` · ${shortDate(p.kickoffUtc)}`} · {p.home ? "em casa" : "fora"}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 font-bold ${r.cls}`}>{r.label}</span>
                  <span className="w-12 text-right text-sm tabular">
                    <strong className="text-white">{p.points}</strong> pts
                  </span>
                </span>
              </div>
              {/* mandante à esquerda, visitante à direita, cada um com o seu escudo */}
              <p className="mt-2 flex items-center gap-2">
                <MiniCrest team={home} />
                <span className="min-w-0 truncate text-sm sm:text-base">
                  <span className={home.id === FORTALEZA ? "font-bold" : "font-semibold"}>{home.name}</span>{" "}
                  <span className="font-display text-lg tabular">
                    {hg} x {ag}
                  </span>{" "}
                  <span className={away.id === FORTALEZA ? "font-bold" : "font-semibold"}>{away.name}</span>
                </span>
                <MiniCrest team={away} />
              </p>
            </li>
          );
        })}
      </ol>
    </LazyDetails>
  );
}

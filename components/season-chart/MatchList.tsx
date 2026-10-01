import { Collapsible } from "@/components/ui/Collapsible";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { FORTALEZA, teamById, timeline } from "@/lib/data";
import { shortDate } from "@/lib/format";

const RESULT = {
  V: { label: "Vitória", cls: "bg-win text-bg" },
  E: { label: "Empate", cls: "bg-draw text-bg" },
  D: { label: "Derrota", cls: "bg-loss text-white" },
} as const;

/** Jogo a jogo: a campanha completa na Série B (seção própria "Os jogos da campanha", recolhida por padrão). */
export function MatchList() {
  const played = timeline.points.filter((p) => p.result && p.opponentId);
  if (played.length === 0) return null;
  const fort = teamById[FORTALEZA];

  return (
    <Collapsible
      cta={played.length === 1 ? "Ver o jogo do Leão" : `Ver os ${played.length} jogos do Leão`}
      description="Os jogos da campanha do Fortaleza até aqui: adversário, placar e pontos depois de cada rodada."
    >
      <ol className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
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
    </Collapsible>
  );
}

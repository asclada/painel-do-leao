import { ChevronDown } from "lucide-react";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { keyGames, teamById } from "@/lib/data";
import { kickoffLabel, pct1 } from "@/lib/format";
import type { RivalGame, Team } from "@/lib/generated/outputs";

const DOT = { V: "bg-win", E: "bg-draw", D: "bg-loss" } as const;
// o que o pipeline mediu (decisão de 30/09): acesso direto; se ele ficar quase impossível, ficar no G6
const METRIC = keyGames.metric === "direct" ? "acesso direto" : "ficar no G6";
// os jogos que mais mexem ficam abertos; o resto, recolhido em "Ver mais jogos que importam para o Leão"
const RIVALS_SHOWN = 3;

/** "pelo Vila Nova" / "pela Ponte Preta" */
function forTeam(t: Team) {
  return `${t.article === "a" ? "pela" : "pelo"} ${t.name}`;
}

type Outcome = RivalGame["order"][number];

/** "vitória do Londrina" / "vitória da Ponte Preta" / "empate" */
function outcomeLabel(o: Outcome, home: Team, away: Team) {
  if (o === "draw") return "empate";
  const t = o === "home" ? home : away;
  return `vitória ${t.article === "a" ? "da" : "do"} ${t.name}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O que dizer ao torcedor, a partir da ordem dos três resultados (melhor -> pior) calculada no pipeline.
 * Quando dois resultados dão praticamente a mesma chance (sameTop/sameBottom), não escolhe um por um fio.
 */
export function rivalAdvice(g: RivalGame, home: Team, away: Team) {
  const [first, second, third] = g.order;
  const label = (o: Outcome) => outcomeLabel(o, home, away);
  if (g.sameTop) {
    // os dois melhores empatam: o que importa é evitar o pior
    const cheer =
      third === "draw"
        ? "Só não pode dar empate"
        : `Torça contra ${third === "home" ? home.article : away.article} ${(third === "home" ? home : away).name}`;
    return { cheer, detail: `${capitalize(label(first))} ou ${label(second)}: dá quase no mesmo para o Leão.` };
  }
  const cheer = first === "draw" ? "Torça pelo empate" : `Torça ${forTeam(first === "home" ? home : away)}`;
  const detail = g.sameBottom
    ? "Qualquer outro resultado atrapalha."
    : `Se não der, ${second === "draw" ? "o empate" : `a ${label(second)}`} ainda serve.`;
  return { cheer, detail };
}

function RivalRow({ g }: { g: RivalGame }) {
  const home = teamById[g.homeId];
  const away = teamById[g.awayId];
  const chance = { home: g.ifHome, draw: g.ifDraw, away: g.ifAway };
  const { cheer, detail } = rivalAdvice(g, home, away);
  // verde = o que ajuda, vermelho = o que atrapalha; resultados "quase iguais" ganham a mesma cor
  const dot = (i: number) =>
    i === 0 || (i === 1 && g.sameTop) ? DOT.V : i === 2 || (i === 1 && g.sameBottom) ? DOT.D : DOT.E;

  return (
    <li className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <p className="text-xs text-muted tabular">
        Rodada {g.round} · {kickoffLabel(g.kickoffUtc)}
      </p>
      <p className="mt-1.5 flex items-center gap-2">
        <MiniCrest team={home} />
        <span className="min-w-0 truncate font-semibold">
          {home.name} x {away.name}
        </span>
        <MiniCrest team={away} />
      </p>
      <p className="mt-3 text-lg font-bold">{cheer}</p>
      <p className="mt-0.5 text-sm text-white/90">{detail}</p>
      {/* as porcentagens ficam recolhidas: o card responde primeiro "para quem torcer" */}
      <LazyDetails
        className="group/card mt-3 border-t border-line pt-1"
        summary={
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Como fica a chance de {METRIC} do Leão em cada resultado</span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open/card:rotate-180" aria-hidden />
          </summary>
        }
      >
        <dl className="mt-1 space-y-1.5 pb-1 text-sm">
          {g.order.map((o, i) => (
            <div key={o} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot(i)}`} aria-hidden />
              <dt className="min-w-0 flex-1 truncate">{capitalize(outcomeLabel(o, home, away))}</dt>
              <dd className="text-muted">
                {METRIC} <strong className="text-white tabular">{pct1(chance[o])}</strong>
              </dd>
            </div>
          ))}
        </dl>
      </LazyDetails>
    </li>
  );
}

/** Métrica das chances desta seção, para os títulos na página ("acesso direto" ou "ficar no G6"). */
export const keyGamesMetric = METRIC;

/**
 * "Pra secar nesta rodada": os jogos dos rivais que mais mexem na chance do Leão, do que mais mexe para o que menos
 * mexe. Tudo vem de data/key-games.json, calculado pelo pipeline com as mesmas simulações do topo.
 */
export function PraSecar() {
  const { rivals } = keyGames;
  if (rivals.length === 0) {
    return <p className="text-white/90">Nenhum outro jogo da rodada mexe de verdade na chance do Leão.</p>;
  }
  return (
    <div className="max-w-3xl">
      <ul className="flex flex-col gap-2.5">
        {rivals.slice(0, RIVALS_SHOWN).map((g) => (
          <RivalRow key={g.matchId} g={g} />
        ))}
      </ul>
      {rivals.length > RIVALS_SHOWN && (
        <LazyDetails
          className="group mt-2.5"
          summary={
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
              Ver mais jogos que importam para o Leão
              <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
          }
        >
          <ul className="mt-2 flex flex-col gap-2.5">
            {rivals.slice(RIVALS_SHOWN).map((g) => (
              <RivalRow key={g.matchId} g={g} />
            ))}
          </ul>
        </LazyDetails>
      )}
    </div>
  );
}

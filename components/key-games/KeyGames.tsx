import { ChevronDown } from "lucide-react";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { FORTALEZA, keyGames, teamById } from "@/lib/data";
import { kickoffLabel, pct1, plural } from "@/lib/format";
import type { FocusGame, RivalGame, Team } from "@/lib/generated/outputs";

const DOT = { V: "bg-win", E: "bg-draw", D: "bg-loss" } as const;
const FOCUS_SHOWN = 3;
// o que o pipeline mediu (decisão de 30/09): acesso direto; se ele ficar quase impossível, ficar no G6
const METRIC = keyGames.metric === "direct" ? "acesso direto" : "ficar no G6";
const RIVALS_SHOWN = 4;

/** "pelo Vila Nova" / "pela Ponte Preta" */
function forTeam(t: Team) {
  return `${t.article === "a" ? "pela" : "pelo"} ${t.name}`;
}

/** Faixa de 0% a 100% com a chance do Leão (acesso direto) se vencer, empatar ou perder aquele jogo. */
function RangeBar({ win, draw, loss }: { win: number | null | undefined; draw: number | null | undefined; loss: number | null | undefined }) {
  const marks = (
    [
      ["D", loss],
      ["E", draw],
      ["V", win],
    ] as const
  ).filter((m): m is readonly ["V" | "E" | "D", number] => m[1] != null);
  if (marks.length < 2) return null;
  const lo = Math.min(...marks.map((m) => m[1]));
  const hi = Math.max(...marks.map((m) => m[1]));
  return (
    <div className="relative mt-3 h-3 rounded-full bg-white/10" aria-hidden>
      <div className="absolute inset-y-0 rounded-full bg-white/25" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
      {marks.map(([k, v]) => (
        <span
          key={k}
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${DOT[k]}`}
          style={{ left: `${v * 100}%` }}
        />
      ))}
    </div>
  );
}

function FocusRow({ g, top }: { g: FocusGame; top: boolean }) {
  const opp = teamById[g.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = g.home ? [fort, opp] : [opp, fort];
  return (
    <li className={`rounded-2xl p-4 ring-1 ${top ? "bg-surface-2 ring-white/30" : "bg-surface ring-line"}`}>
      <p className="text-xs text-muted tabular">
        Rodada {g.round} · {kickoffLabel(g.kickoffUtc)} · {g.home ? "em casa" : "fora"}
      </p>
      <p className="mt-1.5 flex items-center gap-2">
        <MiniCrest team={home} />
        <span className="min-w-0 truncate font-semibold">
          {home.name} x {away.name}
        </span>
        <MiniCrest team={away} />
      </p>
      <RangeBar win={g.ifWin} draw={g.ifDraw} loss={g.ifLoss} />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {(
          [
            ["V", "Vencendo", g.ifWin],
            ["E", "Empatando", g.ifDraw],
            ["D", "Perdendo", g.ifLoss],
          ] as const
        ).map(([k, label, v]) => (
          <div key={k}>
            <dt className="flex items-center gap-1.5 text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[k]}`} aria-hidden />
              {label}
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular">{v != null ? pct1(v) : "—"}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
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
      <dl className="mt-3 space-y-1.5 text-sm">
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
    </li>
  );
}

/** Métrica das chances desta seção, para os títulos na página ("acesso direto" ou "ficar no G6"). */
export const keyGamesMetric = METRIC;

/**
 * Os jogos do Leão que mais mexem na chance. Tudo vem de data/key-games.json, calculado pelo pipeline com as mesmas
 * simulações do topo (a chance quando aquele jogo termina de cada jeito).
 */
export function LeaoKeyGames() {
  const { focus, baseline } = keyGames;
  if (focus.length === 0) return null;
  const top = focus[0];
  const topOpp = teamById[top.opponentId];

  return (
    <div className="max-w-3xl">
      <p className="text-white/90">
        O que mais mexe na chance é contra {topOpp.article === "a" ? "a" : "o"} <strong>{topOpp.name}</strong>, na
        rodada {top.round}: vencendo, a chance de {METRIC} vai a <strong>{pct1(top.ifWin ?? baseline)}</strong>; perdendo,
        cai para <strong>{pct1(top.ifLoss ?? baseline)}</strong>. Hoje ela é {pct1(baseline)}.
      </p>
      <ol className="mt-4 flex flex-col gap-2.5" aria-label="Jogos do Fortaleza que mais mexem na chance">
        {focus.slice(0, FOCUS_SHOWN).map((g, i) => (
          <FocusRow key={g.matchId} g={g} top={i === 0} />
        ))}
      </ol>
      {focus.length > FOCUS_SHOWN && (
        <LazyDetails
          className="group mt-2.5"
          summary={
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
              Ver os outros {plural(focus.length - FOCUS_SHOWN, "jogo")}
              <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
          }
        >
          <ol className="mt-2 flex flex-col gap-2.5" aria-label="Demais jogos do Fortaleza">
            {focus.slice(FOCUS_SHOWN).map((g) => (
              <FocusRow key={g.matchId} g={g} top={false} />
            ))}
          </ol>
        </LazyDetails>
      )}
    </div>
  );
}

/** "Pra secar nesta rodada": os outros jogos da rodada que mais mexem na chance, do melhor ao pior resultado. */
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
              Ver mais {plural(rivals.length - RIVALS_SHOWN, "jogo")}
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

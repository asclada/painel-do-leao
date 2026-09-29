import { ChevronDown } from "lucide-react";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { FORTALEZA, keyGames, teamById } from "@/lib/data";
import { kickoffLabel, pct, plural } from "@/lib/format";
import type { FocusGame, RivalGame, Team } from "@/lib/generated/outputs";

const DOT = { V: "bg-win", E: "bg-draw", D: "bg-loss" } as const;
const FOCUS_SHOWN = 3;
const RIVALS_SHOWN = 4;

/** "pelo Vila Nova" / "pela Ponte Preta" */
function forTeam(t: Team) {
  return `${t.article === "a" ? "pela" : "pelo"} ${t.name}`;
}

/** Faixa de 0% a 100% com a chance do Leão se vencer, empatar ou perder aquele jogo. */
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
            <dd className="mt-0.5 text-lg font-bold tabular">{v != null ? pct(v) : "—"}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function RivalRow({ g }: { g: RivalGame }) {
  const home = teamById[g.homeId];
  const away = teamById[g.awayId];
  const outcomes = [
    ["home", g.ifHome],
    ["draw", g.ifDraw],
    ["away", g.ifAway],
  ] as const;
  const best = outcomes.find(([k]) => k === g.best)![1]!;
  const worst = Math.min(...outcomes.map(([, v]) => v ?? 1));
  const cheer = g.best === "draw" ? "Torça pelo empate" : `Torça ${forTeam(g.best === "home" ? home : away)}`;
  const worstLabel = outcomes.find(([, v]) => v === worst)?.[0];
  const badWinner = worstLabel === "home" ? home : away;
  const worstTxt = worstLabel === "draw" ? "com empate" : `se ${badWinner.article} ${badWinner.name} vencer`;

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
      <p className="mt-1 text-sm text-white/90">
        A chance do Leão vai a <strong>{pct(best)}</strong>. Na pior hipótese ({worstTxt}), fica em {pct(worst)}.
      </p>
    </li>
  );
}

/**
 * "O jogo que mais mexe na chance" e "Pra secar nesta rodada". Tudo vem de data/key-games.json, calculado pelo
 * pipeline com as mesmas simulações do topo (a chance quando aquele jogo termina de cada jeito).
 */
export function KeyGames() {
  const { focus, rivals, baseline, round } = keyGames;
  if (focus.length === 0) return null;
  const top = focus[0];
  const topOpp = teamById[top.opponentId];

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
      <div>
        <h3 className="text-xl font-semibold">Os jogos do Leão</h3>
        <p className="mt-1 text-white/90">
          O que mais mexe na chance é contra {topOpp.article === "a" ? "a" : "o"} <strong>{topOpp.name}</strong>, na
          rodada {top.round}: vencendo, a chance de subir vai a <strong>{pct(top.ifWin ?? baseline)}</strong>; perdendo,
          cai para <strong>{pct(top.ifLoss ?? baseline)}</strong>. Hoje ela é {pct(baseline)}.
        </p>
        <ol className="mt-4 flex flex-col gap-2.5" aria-label="Jogos do Fortaleza que mais mexem na chance">
          {focus.slice(0, FOCUS_SHOWN).map((g, i) => (
            <FocusRow key={g.matchId} g={g} top={i === 0} />
          ))}
        </ol>
        {focus.length > FOCUS_SHOWN && (
          <details className="group mt-2.5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
              Ver os outros {plural(focus.length - FOCUS_SHOWN, "jogo")}
              <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ol className="mt-2 flex flex-col gap-2.5" aria-label="Demais jogos do Fortaleza">
              {focus.slice(FOCUS_SHOWN).map((g) => (
                <FocusRow key={g.matchId} g={g} top={false} />
              ))}
            </ol>
          </details>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold">Pra secar nesta rodada{round ? ` (rodada ${round})` : ""}</h3>
        {rivals.length > 0 ? (
          <>
            <p className="mt-1 text-white/90">
              Os jogos dos rivais da corrida que mais mexem na chance do Leão, e o resultado que mais ajuda.
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {rivals.slice(0, RIVALS_SHOWN).map((g) => (
                <RivalRow key={g.matchId} g={g} />
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-white/90">Nenhum jogo de rival da corrida mexe de verdade na chance do Leão nesta rodada.</p>
        )}
      </div>
    </div>
  );
}

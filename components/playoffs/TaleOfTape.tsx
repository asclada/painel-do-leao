import { FormDots } from "@/components/ui/FormDots";
import { MiniCrest } from "@/components/ui/MiniCrest";
import { FORTALEZA, teamById } from "@/lib/data";
import { plural } from "@/lib/format";
import type { FocusTie, TapeSide } from "@/lib/generated/outputs";
import { focus } from "@/lib/playoffs";

type Row = {
  label: string;
  f: number | null;
  o: number | null;
  fmt?: (v: number) => string;
  /** maior é melhor (gols marcados) ou menor é melhor (gols sofridos) */
  better: "high" | "low";
  hint?: string;
};

const dec = (v: number) => v.toFixed(2).replace(".", ",");
const perGame = (goals: number, played: number) => (played ? goals / played : 0);

function rows(t: FocusTie): Row[] {
  const { focus: f, opponent: o } = t;
  const out: Row[] = [
    { label: "Pontos na Série B", f: f.points, o: o.points, better: "high" },
    { label: "Aproveitamento em casa", f: f.home.pct, o: o.home.pct, fmt: (v) => `${v}%`, better: "high" },
    { label: "Aproveitamento fora", f: f.away.pct, o: o.away.pct, fmt: (v) => `${v}%`, better: "high" },
    { label: "Derrotas em casa", f: f.home.losses, o: o.home.losses, better: "low", hint: "em 19 jogos" },
    { label: "Derrotas fora", f: f.away.losses, o: o.away.losses, better: "low", hint: "em 19 jogos" },
    { label: "Gols marcados por jogo", f: perGame(f.goalsFor, f.played), o: perGame(o.goalsFor, o.played), fmt: dec, better: "high" },
    { label: "Gols sofridos por jogo", f: perGame(f.goalsAgainst, f.played), o: perGame(o.goalsAgainst, o.played), fmt: dec, better: "low" },
    { label: "Jogos sem sofrer gol", f: f.cleanSheets, o: o.cleanSheets, better: "high" },
    { label: "Jogos sem marcar", f: f.failedToScore, o: o.failedToScore, better: "low" },
  ];
  if (f.lateGoalsFor != null && o.lateGoalsFor != null) {
    out.push({ label: "Gols marcados do minuto 76 em diante", f: f.lateGoalsFor, o: o.lateGoalsFor, better: "high" });
    out.push({ label: "Gols sofridos do minuto 76 em diante", f: f.lateGoalsAgainst ?? null, o: o.lateGoalsAgainst ?? null, better: "low" });
  }
  out.push(
    { label: "Pontos nos últimos 10 jogos", f: f.last10Points, o: o.last10Points, better: "high" },
    { label: "Maior sequência sem perder", f: f.longestUnbeaten, o: o.longestUnbeaten, better: "high", hint: "jogos" },
  );
  return out;
}

/** Frases de destaque, escolhidas pelos números (nada escrito à mão). */
export function tapeInsights(t: FocusTie): string[] {
  const { focus: f, opponent: o } = t;
  const oppName = teamById[o.teamId].name;
  const out: string[] = [];
  const nextHome = t.nextLeg === 2 ? t.better : t.nextLeg === 1 ? !t.better : null;
  // o jogo que vem: mando de quem joga em casa x quem joga fora
  if (nextHome === true) {
    out.push(
      `Em casa, o Leão perdeu ${plural(f.home.losses, "vez", "vezes")} em ${f.home.played} jogos; fora, o ${oppName} perdeu ${o.away.losses} dos ${o.away.played}.`,
    );
  } else if (nextHome === false) {
    out.push(
      `Em casa, o ${oppName} fez ${o.home.pct}% dos pontos; fora, o Leão fez ${f.away.pct}%.`,
    );
  }
  if (f.lateGoalsAgainst != null && o.lateGoalsAgainst != null && f.lateGoalsFor != null && o.lateGoalsFor != null) {
    const fBal = f.lateGoalsFor - f.lateGoalsAgainst;
    const oBal = o.lateGoalsFor - o.lateGoalsAgainst;
    if (fBal > oBal) {
      out.push(
        `Do minuto 76 em diante, o Leão marcou ${f.lateGoalsFor} e sofreu ${f.lateGoalsAgainst}; o ${oppName} marcou ${o.lateGoalsFor} e sofreu ${o.lateGoalsAgainst}.`,
      );
    }
  }
  const h2h = t.headToHead;
  if (h2h.length) {
    const res = h2h.map((g) => {
      const fg = g.homeId === FORTALEZA ? g.homeGoals : g.awayGoals;
      const og = g.homeId === FORTALEZA ? g.awayGoals : g.homeGoals;
      return fg > og ? "V" : fg === og ? "E" : "D";
    });
    const scores = h2h
      .map((g) => `${teamById[g.homeId].name} ${g.homeGoals} x ${g.awayGoals} ${teamById[g.awayId].name}`)
      .join(" e ");
    if (res.every((r) => r === "V")) out.push(`Nos ${plural(h2h.length, "jogo")} da Série B, deu Leão: ${scores}.`);
    else if (res.every((r) => r === "D")) out.push(`Nos ${plural(h2h.length, "jogo")} da Série B, deu ${oppName}: ${scores}.`);
    else out.push(`Nos jogos da Série B: ${scores}.`);
  }
  return out;
}

function Side({ s, align }: { s: TapeSide; align: "left" | "right" }) {
  const team = teamById[s.teamId];
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <MiniCrest team={team} />
        <span className="truncate text-lg font-semibold">{team.name}</span>
      </div>
      <span className="text-sm text-muted">{s.position}º na Série B</span>
      <FormDots form={s.form} size="sm" />
    </div>
  );
}

/** Raio-x do confronto: os dois times lado a lado, só com os números dos pontos corridos. */
export function TaleOfTape() {
  if (!focus) return null;
  const t = focus;
  const insights = tapeInsights(t);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-3">
        {insights.map((s) => (
          <p key={s} className="rounded-2xl bg-surface p-4 text-lg font-semibold leading-snug ring-1 ring-line">
            {s}
          </p>
        ))}
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted ring-1 ring-line">
          Pelo modelo, gols esperados no {t.nextLeg === 2 ? "jogo de volta" : "jogo de ida"}:{" "}
          <strong className="text-white">
            Leão {dec(t.focus.expectedGoals)} x {dec(t.opponent.expectedGoals)} {teamById[t.opponentId].name}
          </strong>
          . É a média de gols de cada lado pela força dos times na Série B, com o mando de campo.
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-6">
        <div className="grid grid-cols-2 gap-4 border-b border-line pb-4">
          <Side s={t.focus} align="left" />
          <Side s={t.opponent} align="right" />
        </div>
        <dl className="divide-y divide-line">
          {rows(t).map((r) => {
            if (r.f == null || r.o == null) return null;
            const fmt = r.fmt ?? ((v: number) => String(v));
            const fWins = r.better === "high" ? r.f > r.o : r.f < r.o;
            const oWins = r.better === "high" ? r.o > r.f : r.o < r.f;
            return (
              <div key={r.label} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 py-2.5 text-center">
                <dd className={`text-left font-display text-2xl leading-none tabular ${fWins ? "text-win" : "text-white/70"}`}>{fmt(r.f)}</dd>
                <dt className="text-sm text-muted">
                  {r.label}
                  {r.hint && <span className="block text-xs">{r.hint}</span>}
                </dt>
                <dd className={`text-right font-display text-2xl leading-none tabular ${oWins ? "text-white" : "text-white/70"}`}>{fmt(r.o)}</dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-3 text-xs text-muted">Em verde, onde o Leão leva vantagem. Números dos 38 jogos dos pontos corridos.</p>
      </div>
    </div>
  );
}

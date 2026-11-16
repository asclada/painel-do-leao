// Cards de compartilhar (F6) em JSX para o next/og (Satori: só flexbox, estilos inline, sem variáveis CSS).
import type { ReactNode } from "react";
import { readableText } from "@/lib/color";
import { chanceChange, same, scoreLine } from "@/lib/chance";
import { accessChances } from "@/lib/clinch";
import { fortalezaOdds, fortalezaRow, FORTALEZA, playoffMode, playoffs, retro, standings, teamById, xray } from "@/lib/data";
import type { Curiosity } from "@/lib/curiosities";
import { kickoffLabel, pct, pct1, plural, venueName } from "@/lib/format";
import type { NextMatch, Team } from "@/lib/generated/outputs";
import type { ScenarioResult } from "@/lib/generated/scenario";
import { C } from "@/lib/og/fonts";
import { SITE_HOST, SITE_NAME } from "@/lib/site";
import type { Choice } from "@/lib/simulator-client";
import { finalPoints, predictionPersona } from "@/lib/simulator-text";
import type { Pick } from "@/lib/challenge";
import { type PalpiteGame, scoreGuess, verdictText } from "@/lib/palpite";
import { situation } from "@/lib/situation";
import { LAST_REGULAR_ROUND, type LegScore, legName, roundLabel, tieOutcome } from "@/lib/playoff-rules";
import { advanceLabel, focus, focusTie, legForFocus, legScoreLine, rulePhrase } from "@/lib/playoffs";

export const STORY = { width: 1080, height: 1920 } as const;

const RESULT_COLOR = { V: C.win, E: C.draw, D: C.loss } as const;
const RESULT_TEXT = { V: C.bg, E: C.bg, D: C.white } as const;
const RESULT_WORD = { V: "Vitória", E: "Empate", D: "Derrota" } as const;

function Tricolor({ height = 14 }: { height?: number }) {
  return (
    <div style={{ display: "flex", width: "100%", height }}>
      <div style={{ flex: 1, background: C.red }} />
      <div style={{ flex: 1, background: C.white }} />
      <div style={{ flex: 1, background: C.blue }} />
    </div>
  );
}

function Frame({
  children,
  sub,
  cta,
  glow = true,
}: {
  children: ReactNode;
  sub: string;
  cta: string;
  glow?: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: glow
          ? `radial-gradient(1400px 800px at 50% -200px, rgba(29,78,216,0.45), ${C.bg} 70%)`
          : C.bg,
        color: C.white,
        fontFamily: "Inter",
      }}
    >
      <Tricolor />
      <Brand sub={sub} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingBottom: 40 }}>
        {children}
      </div>
      <Footer cta={cta} />
    </div>
  );
}

function Footer({ cta }: { cta: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 80px 56px" }}>
        <div style={{ fontSize: 34, color: C.muted }}>{cta}</div>
        <div style={{ fontSize: 46, fontWeight: 800, marginTop: 6 }}>{SITE_HOST}</div>
      </div>
      <Tricolor />
    </div>
  );
}

function Brand({ sub }: { sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px 0" }}>
      <div style={{ fontFamily: "Bebas", fontSize: 64, letterSpacing: 1 }}>{SITE_NAME}</div>
      <div style={{ fontSize: 32, color: C.muted, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Dots({ form, size = 34 }: { form: ("V" | "E" | "D")[]; size?: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.35 }}>
      {form.map((r, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size, background: RESULT_COLOR[r] }} />
      ))}
    </div>
  );
}

function Badge({ team, size = 1 }: { team: Team; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 104 * size,
        height: 64 * size,
        padding: `0 ${12 * size}px`,
        borderRadius: 12 * size,
        background: team.color,
        color: readableText(team.color, team.textColor),
        fontFamily: "Bebas",
        fontSize: 44 * size,
        border: "2px solid rgba(255,255,255,0.18)",
      }}
    >
      {team.shortName}
    </div>
  );
}

// ---------------------------------------------------------------- Chances de acesso

/** Uma das duas chances do GE, grande: nome, número e o que ela quer dizer. */
function BigChance({ label, value, hint, color, size }: { label: string; value: string; hint: string; color: string; size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 46, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "Bebas", fontSize: size, lineHeight: 0.9, color, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 34, color: C.muted }}>{hint}</div>
    </div>
  );
}

/**
 * Card "Chances de acesso" — opção A (Placar), escolhida no checkpoint visual 3, agora com as duas chances do GE
 * (decisão do Lucas, 30/09): acesso direto e ir aos playoffs.
 */
export function AccessCard() {
  if (playoffMode && focus) return <PlayoffAccessCard />;
  const sit = situation(standings, FORTALEZA);
  const ch = accessChances(FORTALEZA, fortalezaOdds);

  return (
    <Frame sub={`Fortaleza na Série B · ${plural(fortalezaRow.played, "jogo")}`} cta="Veja a sua conta em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px", gap: 50 }}>
        <BigChance label="Acesso direto" value={ch.direct} hint="terminar em 1º ou 2º" color={C.win} size={300} />
        <BigChance label="Ir aos playoffs" value={ch.playoffs} hint="terminar entre 3º e 6º" color={C.white} size={300} />
      </div>
      <div
        style={{
          display: "flex",
          margin: "80px 80px 0",
          padding: "44px 0",
          borderTop: `2px solid ${C.line}`,
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 180, lineHeight: 0.85 }}>{`${fortalezaRow.position}º`}</div>
          <div style={{ fontSize: 34, color: C.muted, marginTop: 8 }}>{sit.title}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 40 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 180, lineHeight: 0.85 }}>{String(fortalezaRow.points)}</div>
          <div style={{ fontSize: 34, color: C.muted, marginTop: 8 }}>{`pontos em ${plural(fortalezaRow.played, "jogo")}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28, margin: "44px 80px 0" }}>
        <Dots form={xray.streaks.form} size={40} />
        <div style={{ fontSize: 42, fontWeight: 700 }}>{xray.streaks.currentLabel}</div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- A conta mudou

/** Card "A conta mudou": as duas chances antes da rodada do último jogo x agora (lib/chance.ts). */
export function ChangeCard() {
  if (playoffMode && focus) return <PlayoffChangeCard />;
  const change = chanceChange();
  if (!change) return <AccessCard />;
  const { game } = change;
  const verb = (s: { from: number; to: number }) => (same(s) ? "praticamente igual" : s.to > s.from ? "subiu" : "caiu");
  const row = (label: string, s: { from: number; to: number }, color: string) => (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
      <div style={{ fontSize: 44, fontWeight: 700 }}>{`${label}: ${verb(s)}`}</div>
      {/* abaixo de 1 ponto de mudança, só o valor de agora (lib/chance.ts: a diferença pode ser só acaso) */}
      {same(s) ? (
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 10 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 220, lineHeight: 0.9, color }}>{pct1(s.to)}</div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 10 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 150, lineHeight: 0.9, color: C.muted }}>{pct1(s.from)}</div>
          <div style={{ fontFamily: "Bebas", fontSize: 90, lineHeight: 1, color: C.muted }}>→</div>
          <div style={{ fontFamily: "Bebas", fontSize: 220, lineHeight: 0.9, color }}>{pct1(s.to)}</div>
        </div>
      )}
    </div>
  );

  return (
    <Frame sub={`Fortaleza na Série B · ${plural(fortalezaRow.played, "jogo")}`} cta="Acompanhe a conta em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>A conta mudou</div>
        <div style={{ fontSize: 40, color: C.muted, marginTop: 12 }}>{`Rodada ${game.round}: ${scoreLine(game)}`}</div>
        <div style={{ fontSize: 36, color: C.muted, marginTop: 50 }}>{`Antes da rodada ${change.beforeRound + 1} → agora`}</div>
        {row("Acesso direto", change.direct, C.win)}
        {row("Ir aos playoffs", change.playoffs, C.white)}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Minha previsão

export type PredictionGame = { opponent: Team; home: boolean; round: number; choice: Choice };

/** Card "Minha previsão" — opção A (Lista), escolhida no checkpoint visual 3. */
export function PredictionCard({
  games,
  result,
}: {
  games: PredictionGame[];
  result: ScenarioResult;
}) {
  const pts = finalPoints(result);
  const ptsLabel = String(pts.value);
  const persona = predictionPersona(result.choices, result);
  const extras = result.extra ? result.extra.split(",").length : 0;

  // Lista de jogos à esquerda do resultado, números grandes embaixo.
  return (
    <Frame sub="Minha previsão para o Leão na Série B" cta="Faça a sua em">
      <div style={{ display: "flex", flexDirection: "column", margin: "0 80px 40px" }}>
        <div style={{ fontFamily: "Bebas", fontSize: 88, lineHeight: 0.95, color: C.win }}>{persona.title}</div>
        <div style={{ fontSize: 32, color: C.muted, marginTop: 6 }}>{persona.line}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", margin: "0 80px", gap: 14 }}>
        {games.map((g) => (
          <div key={g.round} style={{ display: "flex", alignItems: "center", gap: 28, height: 76 }}>
            <div style={{ width: 90, fontSize: 30, color: C.muted }}>{`R${g.round}`}</div>
            <Badge team={g.opponent} size={0.85} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 38, fontWeight: 700 }}>{g.opponent.name}</div>
              <div style={{ fontSize: 26, color: C.muted }}>{g.home ? "no Castelão" : "fora de casa"}</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 200,
                height: 64,
                borderRadius: 64,
                fontSize: 30,
                fontWeight: 800,
                background: g.choice === "-" ? "transparent" : RESULT_COLOR[g.choice],
                color: g.choice === "-" ? C.muted : RESULT_TEXT[g.choice],
                border: g.choice === "-" ? `2px dashed ${C.line}` : "none",
              }}
            >
              {g.choice === "-" ? "modelo" : RESULT_WORD[g.choice]}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", margin: "64px 80px 0", paddingTop: 44, borderTop: `2px solid ${C.line}` }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 170, lineHeight: 0.85 }}>{ptsLabel}</div>
          <div style={{ fontSize: 32, color: C.muted }}>{pts.exact ? "pontos no fim" : "pontos no fim (provável)"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 170, lineHeight: 0.85 }}>{`${result.mostLikelyPosition}º`}</div>
          <div style={{ fontSize: 32, color: C.muted }}>posição mais provável</div>
        </div>
      </div>
      <div style={{ display: "flex", margin: "48px 80px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 170, lineHeight: 0.85, color: C.win }}>{pct1(result.focus.pDirect)}</div>
          <div style={{ fontSize: 32, color: C.muted }}>acesso direto</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 170, lineHeight: 0.85 }}>{pct1(result.focus.pTop6)}</div>
          <div style={{ fontSize: 32, color: C.muted }}>ir aos playoffs</div>
        </div>
      </div>
      {extras > 0 && (
        <div style={{ fontSize: 28, color: C.muted, margin: "16px 80px 0" }}>
          {`+ ${extras} ${extras === 1 ? "confronto direto escolhido" : "confrontos diretos escolhidos"}`}
        </div>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------- Curiosidade do Raio-X

/** Uma curiosidade do Raio-X: número grande + a frase de destaque do pipeline. */
export function CuriosityCard({ c }: { c: Curiosity }) {
  return (
    <Frame sub={`Raio-X do Leão · ${c.title}`} cta="Mais números do Leão em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontFamily: "Bebas", fontSize: 460, lineHeight: 0.85, color: C.win }}>{c.big}</div>
        <div style={{ fontSize: 52, fontWeight: 700, marginTop: 10 }}>{c.bigLabel}</div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 90,
            paddingTop: 50,
            borderTop: `2px solid ${C.line}`,
          }}
        >
          {c.text}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Próximo jogo

function StoryCrest({ team, src }: { team: Team; src: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 380 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 260, height: 260 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori só entende <img> */}
        {src ? <img src={src} width={240} height={240} style={{ objectFit: "contain" }} alt="" /> : <Badge team={team} size={2} />}
      </div>
      <div style={{ fontSize: 52, fontWeight: 800, marginTop: 24 }}>{team.name}</div>
    </div>
  );
}

/** Card de story do próximo jogo: escudos na ordem mandante x visitante, data, estádio e as chances do Leão. */
export function NextMatchStoryCard({
  match,
  crests,
}: {
  match: NextMatch;
  crests: { home: string | null; away: string | null };
}) {
  const opp = teamById[match.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = match.home ? [fort, opp] : [opp, fort];
  const ch = match.chances;
  return (
    <Frame sub={match.leg ? `Próximo jogo · Playoffs, ${legName(match.leg).toLowerCase()}` : `Próximo jogo · Rodada ${match.round}`} cta="Acompanhe o Leão em">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <StoryCrest team={home} src={crests.home} />
          <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 120, color: C.muted }}>x</div>
          <StoryCrest team={away} src={crests.away} />
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 70 }}>{kickoffLabel(match.kickoffUtc)}</div>
        {match.venue && (
          <div style={{ fontSize: 40, color: C.muted, marginTop: 12 }}>
            {`Estádio: ${venueName(match.venue)}${match.city ? ` · ${match.city}` : ""}${match.venueGuessed ? " (a confirmar)" : ""}`}
          </div>
        )}
        {ch && (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 110 }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: C.muted, alignSelf: "center" }}>Chances do Leão neste jogo</div>
            <div style={{ display: "flex", width: "100%", height: 36, marginTop: 24, gap: 6 }}>
              <div style={{ display: "flex", width: `${ch.win * 100}%`, background: C.win, borderRadius: 18 }} />
              <div style={{ display: "flex", width: `${ch.draw * 100}%`, background: C.draw, borderRadius: 18 }} />
              <div style={{ display: "flex", width: `${ch.loss * 100}%`, background: C.loss, borderRadius: 18 }} />
            </div>
            <div style={{ display: "flex", marginTop: 26 }}>
              {(
                [
                  ["Vitória", ch.win],
                  ["Empate", ch.draw],
                  ["Derrota", ch.loss],
                ] as const
              ).map(([label, v]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ fontFamily: "Bebas", fontSize: 130, lineHeight: 0.9 }}>{pct(v)}</div>
                  <div style={{ fontSize: 38, color: C.muted }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Provocação (modelo x eu)

/** "O modelo dá 37,6% de acesso direto. Eu dou 81,2%." — a previsão do torcedor contra as chances de agora. */
export function ProvocationCard({ result }: { result: ScenarioResult }) {
  const persona = predictionPersona(result.choices, result);
  const diff = Math.round(100 * (result.focus.pDirect - fortalezaOdds.pDirect));
  const verdict =
    diff >= 10 ? "Sou mais otimista que o modelo." : diff <= -10 ? "Sou mais pé atrás que o modelo." : "Eu e o modelo pensamos parecido.";
  const pts = finalPoints(result).value;

  return (
    <Frame sub="Chances do Leão na Série B" cta="Faça a sua previsão em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>Quem tem razão?</div>
        <div style={{ display: "flex", marginTop: 60 }}>
          {(
            [
              ["O modelo", fortalezaOdds, C.muted, C.muted],
              ["Eu", result.focus, C.white, C.win],
            ] as const
          ).map(([who, o, labelColor, color]) => (
            <div key={who} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 44, color: labelColor }}>{who}</div>
              <div style={{ fontFamily: "Bebas", fontSize: 200, lineHeight: 0.9, color }}>{pct1(o.pDirect)}</div>
              <div style={{ fontSize: 32, color: C.muted }}>acesso direto</div>
              <div style={{ fontFamily: "Bebas", fontSize: 110, lineHeight: 0.9, color: labelColor, marginTop: 24 }}>{pct1(o.pTop6)}</div>
              <div style={{ fontSize: 32, color: C.muted }}>ir aos playoffs</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, marginTop: 50 }}>{verdict}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 70,
            paddingTop: 44,
            borderTop: `2px solid ${C.line}`,
          }}
        >
          <div style={{ fontFamily: "Bebas", fontSize: 96, lineHeight: 0.95, color: C.win }}>{persona.title}</div>
          <div style={{ fontSize: 36, color: C.muted, marginTop: 10 }}>{persona.line}</div>
          <div style={{ fontSize: 36, color: C.white, marginTop: 24 }}>
            {`Na minha conta: ${pts} pontos e ${result.mostLikelyPosition}º lugar.`}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Duelo

export type DuelRow = { round: number; opponent: Team; home: boolean; a: Pick | null; b: Pick | null; result: Pick | null };

/** "Lucas x João: quem conhece mais o Leão?" — as duas previsões lado a lado, com o placar de acertos. */
export function DuelCard({
  aName,
  bName,
  rows,
  score,
  points,
  chances,
}: {
  aName: string;
  bName: string;
  rows: DuelRow[];
  score: { a: number; b: number; counted: number };
  points: [number, number];
  chances: [{ direct: number; playoffs: number }, { direct: number; playoffs: number }] | null;
}) {
  const chip = (p: Pick | null, hit: boolean) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 84,
        height: 64,
        borderRadius: 16,
        fontFamily: "Bebas",
        fontSize: 48,
        background: p ? RESULT_COLOR[p] : "transparent",
        color: p ? RESULT_TEXT[p] : C.muted,
        border: hit ? `5px solid ${C.white}` : p ? "none" : `2px dashed ${C.line}`,
      }}
    >
      {p ?? "–"}
    </div>
  );
  const shown = rows.slice(-10);
  return (
    <Frame sub="Quem conhece mais o Leão?" cta="Entre no duelo em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, fontFamily: "Bebas", fontSize: 110, lineHeight: 1 }}>
          <div style={{ display: "flex" }}>{aName}</div>
          <div style={{ display: "flex", color: C.muted, fontSize: 80 }}>x</div>
          <div style={{ display: "flex" }}>{bName}</div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 10 }}>
          {score.counted > 0 ? `Placar: ${score.a} x ${score.b} em acertos` : "O placar começa no próximo jogo do Leão"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 28, color: C.muted }}>
            <div style={{ display: "flex", flex: 1 }}>Jogo</div>
            <div style={{ display: "flex", width: 84, justifyContent: "center" }}>{aName.slice(0, 6)}</div>
            <div style={{ display: "flex", width: 84, justifyContent: "center" }}>{bName.slice(0, 6)}</div>
            <div style={{ display: "flex", width: 84, justifyContent: "center" }}>Deu</div>
          </div>
          {shown.map((r) => (
            <div key={r.round} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", width: 76, fontSize: 30, color: C.muted }}>{`R${r.round}`}</div>
                <Badge team={r.opponent} size={0.8} />
                <div style={{ display: "flex", fontSize: 30, color: C.muted }}>{r.home ? "casa" : "fora"}</div>
              </div>
              {chip(r.a, !!r.result && r.a === r.result)}
              {chip(r.b, !!r.result && r.b === r.result)}
              {r.result ? chip(r.result, false) : (
                <div style={{ display: "flex", width: 84, justifyContent: "center", fontSize: 24, color: C.muted }}>—</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 56, paddingTop: 40, borderTop: `2px solid ${C.line}` }}>
          {[aName, bName].map((n, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 34, color: C.muted }}>{n}</div>
              <div style={{ fontFamily: "Bebas", fontSize: 120, lineHeight: 0.9 }}>{`${points[i]} pts`}</div>
              {chances && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 34, color: C.win, fontWeight: 700 }}>{`${pct1(chances[i].direct)} acesso direto`}</div>
                  <div style={{ fontSize: 30, color: C.muted }}>{`${pct1(chances[i].playoffs)} ir aos playoffs`}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function predictionGames(fixtures: { opponentId: string; home: boolean; round: number }[], choices: Choice[]) {
  return fixtures.map((f, i) => ({ opponent: teamById[f.opponentId], home: f.home, round: f.round, choice: choices[i] }));
}

// ---------------------------------------------------------------- Preview de link (Open Graph, 1200×630)

export const OG = { width: 1200, height: 630 } as const;
export const OG_ALT = `${SITE_NAME}: posição do Fortaleza na Série B e as chances de acesso`;

export function OgCard() {
  if (playoffMode && focus) return <PlayoffOgCard />;
  const sit = situation(standings, FORTALEZA);
  const ch = accessChances(FORTALEZA, fortalezaOdds);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(900px 500px at 20% -150px, rgba(29,78,216,0.5), ${C.bg} 70%)`,
        color: C.white,
        fontFamily: "Inter",
      }}
    >
      <Tricolor height={12} />
      <div style={{ display: "flex", flex: 1, padding: "56px 72px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 60 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 28, color: C.muted }}>{`O Leão na Série B · situação atual, ${plural(fortalezaRow.played, "jogo")}`}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: "auto" }}>
            <div style={{ fontFamily: "Bebas", fontSize: 230, lineHeight: 0.8 }}>{`${fortalezaRow.position}º`}</div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 10 }}>
              <div style={{ fontSize: 34, fontWeight: 800, maxWidth: 360 }}>{sit.title}</div>
              <div style={{ fontSize: 28, color: C.muted, marginTop: 4 }}>{`${plural(fortalezaRow.points, "ponto")} · ${xray.streaks.currentLabel.toLowerCase()}`}</div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            paddingLeft: 40,
            borderLeft: `3px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700 }}>Acesso direto</div>
          <div style={{ fontFamily: "Bebas", fontSize: 170, lineHeight: 0.85, color: C.win }}>{ch.direct}</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 18 }}>Ir aos playoffs</div>
          <div style={{ fontFamily: "Bebas", fontSize: 120, lineHeight: 0.85 }}>{ch.playoffs}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Palpite da rodada

/**
 * "Cravei Fortaleza 2 x 1 Náutico": o palpite antes do jogo (com as chances do modelo) e, depois, o placar real e
 * os pontos. Os escudos seguem a ordem mandante x visitante, como no card do próximo jogo.
 */
export function PalpiteCard({
  game,
  guess,
  crests,
  total,
}: {
  game: PalpiteGame;
  guess: { home: number; away: number };
  crests: { home: string | null; away: string | null };
  total: { points: number; games: number } | null;
}) {
  const opp = teamById[game.opponentId];
  const fort = teamById[FORTALEZA];
  const [home, away] = game.home ? [fort, opp] : [opp, fort];
  const verdict = game.score ? scoreGuess({ round: game.round, ...guess, at: 0 }, game) : null;
  const crest = (team: Team, src: string | null) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori só entende <img> */}
        {src ? <img src={src} width={200} height={200} style={{ objectFit: "contain" }} alt="" /> : <Badge team={team} size={1.8} />}
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, marginTop: 20 }}>{team.name}</div>
    </div>
  );
  const scoreRow = (h: number, a: number, color: string, size: number) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas", fontSize: size, lineHeight: 0.9, color }}>
      <div style={{ display: "flex", width: size * 0.7, justifyContent: "center" }}>{String(h)}</div>
      <div style={{ display: "flex", fontSize: size * 0.5, color: C.muted, margin: "0 20px" }}>x</div>
      <div style={{ display: "flex", width: size * 0.7, justifyContent: "center" }}>{String(a)}</div>
    </div>
  );

  return (
    <Frame sub={game.round > LAST_REGULAR_ROUND ? `Palpite · ${roundLabel(game.round)}` : `Palpite da rodada ${game.round}`} cta={game.score ? "Dê o seu palpite em" : "E você, quanto crava? Palpite em"}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 60px" }}>
        <div style={{ fontFamily: "Bebas", fontSize: 130, lineHeight: 0.9, color: C.win }}>Cravei</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 50 }}>
          {crest(home, crests.home)}
          {crest(away, crests.away)}
        </div>
        <div style={{ display: "flex", marginTop: 30 }}>{scoreRow(guess.home, guess.away, C.white, 300)}</div>
        {game.score && verdict ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginTop: 50, paddingTop: 44, borderTop: `2px solid ${C.line}` }}>
            <div style={{ fontSize: 40, color: C.muted }}>Deu</div>
            {scoreRow(game.score.home, game.score.away, C.muted, 170)}
            <div style={{ fontSize: 56, fontWeight: 800, marginTop: 30, color: verdict.result ? C.win : C.white }}>{verdictText(verdict)}</div>
            {total && (
              <div style={{ fontSize: 38, color: C.muted, marginTop: 16 }}>
                {`No total: ${plural(total.points, "ponto")} em ${plural(total.games, "palpite")}`}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60 }}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>{kickoffLabel(game.kickoffUtc)}</div>
            {game.chances && (
              <div style={{ fontSize: 38, color: C.muted, marginTop: 20 }}>
                {`O modelo dá ${pct(game.chances.win)} de vitória do Leão`}
              </div>
            )}
          </div>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Playoffs

function aggregateNow() {
  if (!focusTie || !focus) return null;
  const played = focusTie.legs.map(legForFocus).filter((x): x is { f: number; o: number } => x !== null);
  return played.length ? tieOutcome(focus.better, played) : null;
}

/** "Chance de subir" nos playoffs: o confronto, a chance de passar, o placar somado e os dois jogos. */
function PlayoffAccessCard() {
  if (!focus || !focusTie || !playoffs) return null;
  const opp = teamById[focus.opponentId];
  const agg = aggregateNow();
  const finished = playoffs.state === "finished";
  return (
    <Frame sub={`Fortaleza nos playoffs · ${focusTie.betterPosition}º x ${focusTie.worsePosition}º`} cta="Acompanhe o confronto em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 50, fontWeight: 800 }}>{`Fortaleza x ${opp.name}`}</div>
        {finished ? (
          <div style={{ fontFamily: "Bebas", fontSize: 200, lineHeight: 0.9, color: C.win, marginTop: 40 }}>
            {focus.pAdvance >= 0.5 ? "Acesso!" : "Fim do sonho"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
            <div style={{ fontSize: 46, fontWeight: 700 }}>Chance de subir para a Série A</div>
            <div style={{ fontFamily: "Bebas", fontSize: 360, lineHeight: 0.9, color: C.win, marginTop: 6 }}>{advanceLabel(focus.pAdvance)}</div>
          </div>
        )}
        {agg && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
            <div style={{ fontSize: 36, color: C.muted }}>Placar somado</div>
            <div style={{ fontFamily: "Bebas", fontSize: 110, lineHeight: 0.95 }}>{`Fortaleza ${agg.f} x ${agg.o} ${opp.name}`}</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 60, paddingTop: 40, borderTop: `2px solid ${C.line}`, gap: 18 }}>
          {focusTie.legs.map((l) => (
            <div key={l.matchId} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, color: C.muted }}>{legName(l.leg)}</div>
              <div style={{ fontSize: 42, fontWeight: 700 }}>
                {legForFocus(l) ? legScoreLine(l) : `${teamById[l.homeId].name} x ${teamById[l.awayId].name} · ${kickoffLabel(l.kickoffUtc)}`}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 34, color: C.muted, marginTop: 44 }}>{rulePhrase(focus.better, focus.opponentId)}</div>
      </div>
    </Frame>
  );
}

/** "A conta mudou" nos playoffs: a chance de subir antes da ida x agora. */
function PlayoffChangeCard() {
  if (!focus || !focusTie) return null;
  const first = focusTie.legs.find((l) => l.leg === 1);
  if (!first || !legForFocus(first)) return <PlayoffAccessCard />;
  const s = { from: focus.pAdvanceStart, to: focus.pAdvance };
  const verb = same(s) ? "praticamente igual" : s.to > s.from ? "subiu" : "caiu";
  return (
    <Frame sub="Fortaleza nos playoffs" cta="Acompanhe a conta em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>A conta mudou</div>
        <div style={{ fontSize: 40, color: C.muted, marginTop: 12 }}>{`Ida: ${legScoreLine(first)}`}</div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 90 }}>{`Chance de subir: ${verb}`}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 10 }}>
          {!same(s) && <div style={{ fontFamily: "Bebas", fontSize: 150, lineHeight: 0.9, color: C.muted }}>{pct1(s.from)}</div>}
          {!same(s) && <div style={{ fontFamily: "Bebas", fontSize: 90, lineHeight: 1, color: C.muted }}>→</div>}
          <div style={{ fontFamily: "Bebas", fontSize: 260, lineHeight: 0.9, color: C.win }}>{advanceLabel(s.to)}</div>
        </div>
        <div style={{ fontSize: 36, color: C.muted, marginTop: 30 }}>Antes da ida → agora</div>
      </div>
    </Frame>
  );
}

/** Retrospectiva dos pontos corridos: os momentos da campanha, com a posição e a chance de G6 em cada um. */
export function RetroCard() {
  if (!retro) return <AccessCard />;
  return (
    <Frame sub="A campanha na Série B" cta="A história completa em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 64, fontWeight: 800 }}>A campanha em momentos</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, gap: 26 }}>
          {retro.moments.map((m, i) => (
            <div key={`${m.kind}-${m.round}`} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 64,
                  background: C.blue,
                  fontSize: 32,
                  fontWeight: 800,
                }}
              >
                {String(i + 1)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: 40, fontWeight: 800 }}>{m.title}</div>
                <div style={{ fontSize: 30, color: C.muted }}>
                  {`Rodada ${m.round} · ${m.position}º${m.pG6 != null ? ` · ${pct(m.pG6)} de chance de G6` : ""}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 56, paddingTop: 36, borderTop: `2px solid ${C.line}` }}>
          {(
            [
              [`${fortalezaRow.position}º`, "lugar final"],
              [String(fortalezaRow.points), "pontos"],
              [String(retro.longestUnbeaten), "jogos sem perder"],
            ] as const
          ).map(([big, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontFamily: "Bebas", fontSize: 130, lineHeight: 0.9 }}>{big}</div>
              <div style={{ fontSize: 30, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** "Meu confronto": os placares que o torcedor escolheu para a ida e a volta, o placar somado e quem sobe. */
export function ConfrontoCard({ legs }: { legs: LegScore[] }) {
  if (!focus || !focusTie) return <AccessCard />;
  const opp = teamById[focus.opponentId];
  const forFocus = focusTie.legs.map((l, i) =>
    l.homeId === FORTALEZA ? { f: legs[i].home, o: legs[i].away } : { f: legs[i].away, o: legs[i].home },
  );
  const r = tieOutcome(focus.better, forFocus);
  const oppWith = `${opp.article === "a" ? "a" : "o"} ${opp.name}`;
  return (
    <Frame sub="Meu palpite para o confronto" cta="Monte o seu em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        {focusTie.legs.map((l, i) => (
          <div key={l.matchId} style={{ display: "flex", flexDirection: "column", marginBottom: 46 }}>
            <div style={{ fontSize: 38, color: C.muted }}>{legName(l.leg)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 6 }}>
              <div style={{ fontSize: 56, fontWeight: 800, flex: 1 }}>{teamById[l.homeId].name}</div>
              <div style={{ fontFamily: "Bebas", fontSize: 150, lineHeight: 0.9 }}>{`${legs[i].home} x ${legs[i].away}`}</div>
              <div style={{ fontSize: 56, fontWeight: 800, flex: 1, textAlign: "right", justifyContent: "flex-end", display: "flex" }}>
                {teamById[l.awayId].name}
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", paddingTop: 40, borderTop: `2px solid ${C.line}` }}>
          <div style={{ fontSize: 38, color: C.muted }}>Placar somado</div>
          <div style={{ fontFamily: "Bebas", fontSize: 120, lineHeight: 0.95 }}>{`Fortaleza ${r.f} x ${r.o} ${opp.name}`}</div>
          <div style={{ fontFamily: "Bebas", fontSize: 190, lineHeight: 0.9, color: r.advances ? C.win : C.white, marginTop: 30 }}>
            {r.advances ? "O Leão sobe!" : `Sobe ${oppWith}`}
          </div>
          {r.byTiebreak && (
            <div style={{ fontSize: 36, color: C.muted, marginTop: 10 }}>Empate no placar somado: passa a melhor campanha.</div>
          )}
        </div>
      </div>
    </Frame>
  );
}

/** Prévia do link nos playoffs: o confronto e a chance de subir. */
function PlayoffOgCard() {
  if (!focus || !focusTie) return null;
  const opp = teamById[focus.opponentId];
  const agg = aggregateNow();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(900px 500px at 20% -150px, rgba(29,78,216,0.5), ${C.bg} 70%)`,
        color: C.white,
        fontFamily: "Inter",
      }}
    >
      <Tricolor height={12} />
      <div style={{ display: "flex", flex: 1, padding: "56px 72px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 60 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 28, color: C.muted }}>{`Playoffs da Série B · ${focusTie.betterPosition}º x ${focusTie.worsePosition}º`}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div style={{ fontFamily: "Bebas", fontSize: 110, lineHeight: 0.9 }}>{`Fortaleza x ${opp.name}`}</div>
            <div style={{ fontSize: 30, color: C.muted, marginTop: 8 }}>
              {agg ? `Placar somado: Fortaleza ${agg.f} x ${agg.o} ${opp.name}` : `${fortalezaRow.position}º lugar nos pontos corridos, ${plural(fortalezaRow.points, "ponto")}`}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            paddingLeft: 40,
            borderLeft: `3px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700 }}>Chance de subir</div>
          <div style={{ fontFamily: "Bebas", fontSize: 190, lineHeight: 0.85, color: C.win }}>{advanceLabel(focus.pAdvance)}</div>
        </div>
      </div>
    </div>
  );
}

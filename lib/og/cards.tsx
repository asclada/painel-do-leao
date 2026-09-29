// Cards de compartilhar (F6) em JSX para o next/og (Satori: só flexbox, estilos inline, sem variáveis CSS).
// Duas variações de cada card para o checkpoint visual 3: "placar" (A) e "pôster" (B).
import type { ReactNode } from "react";
import { fortalezaOdds, fortalezaRow, FORTALEZA, meta, standings, teamById, timeline, xray } from "@/lib/data";
import { pct, plural } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import type { ScenarioResult } from "@/lib/generated/scenario";
import { C } from "@/lib/og/fonts";
import { SITE_HOST, SITE_NAME } from "@/lib/site";
import type { Choice } from "@/lib/simulator-client";
import { finalPoints, pG6 } from "@/lib/simulator-text";
import { situation } from "@/lib/situation";

export type CardVariant = "a" | "b";
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
        color: team.textColor ?? C.white,
        fontFamily: "Bebas",
        fontSize: 44 * size,
        border: "2px solid rgba(255,255,255,0.18)",
      }}
    >
      {team.shortName}
    </div>
  );
}

/** Mini montanha-russa: posição rodada a rodada (1º no topo), com faixas G2/G6/Z4. */
function SeasonLine({ width, height }: { width: number; height: number }) {
  const pad = 16;
  const x = (r: number) => pad + ((r - 1) / 37) * (width - 2 * pad);
  const y = (p: number) => pad + ((p - 1) / 19) * (height - 2 * pad);
  const band = (a: number, b: number) => ({ y: y(a - 0.5), h: y(b + 0.5) - y(a - 0.5) });
  const g2 = band(1, 2);
  const g6 = band(3, 6);
  const z4 = band(17, 20);
  const pts = timeline.points;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={g2.y} width={width} height={g2.h} fill={C.blue} fillOpacity={0.45} />
      <rect x={0} y={g6.y} width={width} height={g6.h} fill={C.blue} fillOpacity={0.2} />
      <rect x={0} y={z4.y} width={width} height={z4.h} fill={C.muted} fillOpacity={0.1} />
      <polyline
        points={pts.map((p) => `${x(p.round)},${y(p.position)}`).join(" ")}
        fill="none"
        stroke={C.white}
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p) => (
        <circle key={p.round} cx={x(p.round)} cy={y(p.position)} r={7} fill={p.result ? RESULT_COLOR[p.result] : C.white} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- Chance de acesso

export function AccessCard({ variant }: { variant: CardVariant }) {
  const sit = situation(standings, FORTALEZA);
  const round = meta.lastCompletedRound;
  const chance = pct(fortalezaOdds.pPromotion);

  if (variant === "a") {
    // "Placar": o número da chance domina a tela, como no topo do site.
    return (
      <Frame sub={`Fortaleza na Série B · depois da rodada ${round}`} cta="Veja a sua conta em">
        <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>Chance de subir para a Série A</div>
          <div style={{ fontFamily: "Bebas", fontSize: 520, lineHeight: 0.9, color: C.red, marginTop: 20 }}>{chance}</div>
          <div style={{ fontSize: 40, color: C.muted, marginTop: 10 }}>
            {`Direto: ${pct(fortalezaOdds.pDirect)} · via playoffs: ${pct(fortalezaOdds.pPlayoffPromotion)}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            margin: "110px 80px 0",
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

  // "Pôster": posição gigante + a montanha-russa da temporada + barra da chance.
  return (
    <Frame glow={false} sub={`Série B 2026 · rodada ${round}`} cta="Veja a sua conta em">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 36, padding: "0 80px" }}>
        <div style={{ fontFamily: "Bebas", fontSize: 400, lineHeight: 0.8 }}>{`${fortalezaRow.position}º`}</div>
        <div style={{ display: "flex", flexDirection: "column", paddingBottom: 18 }}>
          <div style={{ fontSize: 46, fontWeight: 800, maxWidth: 520 }}>{sit.title}</div>
          <div style={{ fontSize: 36, color: C.muted, marginTop: 8 }}>
            {`${plural(fortalezaRow.points, "ponto")} · ${sit.gap}`}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", margin: "70px 80px 0" }}>
        <div style={{ fontSize: 34, color: C.muted, marginBottom: 18 }}>A montanha-russa até aqui</div>
        <SeasonLine width={920} height={400} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted, marginTop: 10 }}>
          <span>Rodada 1</span>
          <span>Rodada 38</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "70px 80px 0",
          padding: "44px 48px",
          borderRadius: 36,
          background: C.surface,
          border: `2px solid ${C.line}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 40, fontWeight: 700, maxWidth: 480 }}>Chance de subir para a Série A</div>
          <div style={{ fontFamily: "Bebas", fontSize: 200, lineHeight: 0.8, color: C.red }}>{chance}</div>
        </div>
        <div style={{ display: "flex", width: "100%", height: 28, borderRadius: 28, background: "rgba(168,180,216,0.16)", marginTop: 28 }}>
          <div style={{ width: `${fortalezaOdds.pPromotion * 100}%`, height: "100%", borderRadius: 28, background: C.red }} />
        </div>
        <div style={{ display: "flex", fontSize: 34, color: C.muted, marginTop: 20 }}>
          {`Direto ${pct(fortalezaOdds.pDirect)} · playoffs ${pct(fortalezaOdds.pPlayoffPromotion)} · ${xray.streaks.currentLabel.toLowerCase()}`}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- Minha previsão

export type PredictionGame = { opponent: Team; home: boolean; round: number; choice: Choice };

export function PredictionCard({
  variant,
  games,
  result,
}: {
  variant: CardVariant;
  games: PredictionGame[];
  result: ScenarioResult;
}) {
  const pts = finalPoints(result);
  const ptsLabel = String(pts.value);
  const free = games.filter((g) => g.choice === "-").length;

  if (variant === "a") {
    // Lista de jogos à esquerda do resultado, números grandes embaixo.
    return (
      <Frame sub="Minha previsão para o Leão na Série B" cta="Faça a sua em">
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
                {g.choice === "-" ? "sorteio" : RESULT_WORD[g.choice]}
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
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "48px 80px 0" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700 }}>Chance de acesso</div>
            <div style={{ fontSize: 32, color: C.muted, marginTop: 6 }}>
              {`direto ${pct(result.focus.pDirect)} · G6 ${pct(pG6(result))}`}
            </div>
          </div>
          <div style={{ fontFamily: "Bebas", fontSize: 220, lineHeight: 0.8, color: C.red }}>{pct(result.focus.pPromotion)}</div>
        </div>
      </Frame>
    );
  }

  // "Pôster": resultado gigante em cima, escolhas em ladrilhos e a distribuição de posições.
  const max = Math.max(...result.focus.positionDist, 0.0001);
  return (
    <Frame glow={false} sub="Minha previsão para o Leão na Série B" cta="Faça a sua em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 44, color: C.muted }}>
          {pts.exact ? "Com os meus resultados, o Fortaleza termina com" : "Com os meus resultados, o Fortaleza termina com cerca de"}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 10 }}>
          <div style={{ fontFamily: "Bebas", fontSize: 300, lineHeight: 0.8 }}>{ptsLabel}</div>
          <div style={{ fontFamily: "Bebas", fontSize: 110, lineHeight: 1, paddingBottom: 10 }}>
            {`pontos · ${result.mostLikelyPosition}º`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, margin: "70px 80px 0" }}>
        {games.map((g) => (
          <div
            key={g.round}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 215,
              padding: "20px 0 18px",
              borderRadius: 28,
              background: g.choice === "-" ? C.surface : RESULT_COLOR[g.choice],
              color: g.choice === "-" ? C.muted : RESULT_TEXT[g.choice],
            }}
          >
            <div style={{ fontFamily: "Bebas", fontSize: 70, lineHeight: 1 }}>{g.opponent.shortName}</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {`${g.choice === "-" ? "sorteio" : RESULT_WORD[g.choice]} · ${g.home ? "casa" : "fora"}`}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", margin: "70px 80px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", height: 190, gap: 8 }}>
          {result.focus.positionDist.map((p, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: p > 0 ? Math.max(4, (p / max) * 190) : 0,
                borderRadius: "6px 6px 0 0",
                background: i < 2 ? C.white : i < 6 ? C.sky : "rgba(168,180,216,0.35)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted, marginTop: 10 }}>
          <span>1º</span>
          <span>chance de terminar em cada posição</span>
          <span>20º</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "60px 80px 0" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>Chance de acesso</div>
          <div style={{ fontSize: 32, color: C.muted, marginTop: 6 }}>
            {free > 0 ? `${plural(free, "jogo")} no sorteio` : "todos os jogos escolhidos"}
          </div>
        </div>
        <div style={{ fontFamily: "Bebas", fontSize: 200, lineHeight: 0.8, color: C.red }}>{pct(result.focus.pPromotion)}</div>
      </div>
    </Frame>
  );
}

export function predictionGames(fixtures: { opponentId: string; home: boolean; round: number }[], choices: Choice[]) {
  return fixtures.map((f, i) => ({ opponent: teamById[f.opponentId], home: f.home, round: f.round, choice: choices[i] }));
}

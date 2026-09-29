// Cards de compartilhar (F6) em JSX para o next/og (Satori: só flexbox, estilos inline, sem variáveis CSS).
import type { ReactNode } from "react";
import { readableText } from "@/lib/color";
import { chanceChange, scoreLine } from "@/lib/chance";
import { fortalezaOdds, fortalezaRow, FORTALEZA, standings, teamById, xray } from "@/lib/data";
import { pct, plural } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import type { ScenarioResult } from "@/lib/generated/scenario";
import { C } from "@/lib/og/fonts";
import { SITE_HOST, SITE_NAME } from "@/lib/site";
import type { Choice } from "@/lib/simulator-client";
import { finalPoints, pG6 } from "@/lib/simulator-text";
import { situation } from "@/lib/situation";

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

// ---------------------------------------------------------------- Chance de acesso

/** Card "Chance de acesso" — opção A (Placar), escolhida no checkpoint visual 3: a chance domina a tela. */
export function AccessCard() {
  const sit = situation(standings, FORTALEZA);
  const chance = pct(fortalezaOdds.pPromotion);

  return (
    <Frame sub={`Fortaleza na Série B · ${plural(fortalezaRow.played, "jogo")}`} cta="Veja a sua conta em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 48, fontWeight: 700 }}>Chance de subir para a Série A</div>
        <div style={{ fontFamily: "Bebas", fontSize: 520, lineHeight: 0.9, color: C.win, marginTop: 20 }}>{chance}</div>
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

// ---------------------------------------------------------------- A conta mudou

/** Card "A conta mudou": a chance antes da rodada do último jogo x agora (lib/chance.ts). */
export function ChangeCard() {
  const change = chanceChange();
  if (!change) return <AccessCard />;
  const { game, from, to, diff } = change;
  const verb = diff > 0 ? "subiu" : diff < 0 ? "caiu" : "ficou igual";

  return (
    <Frame sub={`Fortaleza na Série B · ${plural(fortalezaRow.played, "jogo")}`} cta="Acompanhe a conta em">
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px" }}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>A conta mudou</div>
        <div style={{ fontSize: 40, color: C.muted, marginTop: 12 }}>{`Rodada ${game.round}: ${scoreLine(game)}`}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
          <div style={{ fontSize: 40, color: C.muted }}>{`Antes da rodada ${change.beforeRound + 1}`}</div>
          <div style={{ fontFamily: "Bebas", fontSize: 260, lineHeight: 0.9, color: C.muted }}>{`${from}%`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <div style={{ fontSize: 40, color: C.white }}>Agora</div>
          <div style={{ fontFamily: "Bebas", fontSize: 420, lineHeight: 0.9, color: C.win }}>{`${to}%`}</div>
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 30 }}>{`A chance de subir para a Série A ${verb}.`}</div>
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
        <div style={{ fontFamily: "Bebas", fontSize: 220, lineHeight: 0.8, color: C.win }}>{pct(result.focus.pPromotion)}</div>
      </div>
    </Frame>
  );
}

export function predictionGames(fixtures: { opponentId: string; home: boolean; round: number }[], choices: Choice[]) {
  return fixtures.map((f, i) => ({ opponent: teamById[f.opponentId], home: f.home, round: f.round, choice: choices[i] }));
}

// ---------------------------------------------------------------- Preview de link (Open Graph, 1200×630)

export const OG = { width: 1200, height: 630 } as const;
export const OG_ALT = `${SITE_NAME}: posição do Fortaleza na Série B e a chance de acesso`;

export function OgCard() {
  const sit = situation(standings, FORTALEZA);
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
          <div style={{ fontSize: 34, fontWeight: 700 }}>Chance de subir</div>
          <div style={{ fontFamily: "Bebas", fontSize: 250, lineHeight: 0.85, color: C.win }}>{pct(fortalezaOdds.pPromotion)}</div>
          <div style={{ fontSize: 28, color: C.muted }}>{`direto ${pct(fortalezaOdds.pDirect)} · playoffs ${pct(fortalezaOdds.pPlayoffPromotion)}`}</div>
        </div>
      </div>
    </div>
  );
}

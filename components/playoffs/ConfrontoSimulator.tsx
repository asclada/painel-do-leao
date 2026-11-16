"use client";

import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ShareButton } from "@/components/share/ShareButton";
import { kickoffLabel } from "@/lib/format";
import {
  CONFRONTO_PARAM,
  decodeConfronto,
  encodeConfronto,
  type LegScore,
  legName,
  tieOutcome,
} from "@/lib/playoff-rules";

export type SimLeg = { leg: number; homeId: string; awayId: string; kickoffUtc: string; final: LegScore | null };
type TeamInfo = { name: string; article: "o" | "a" };

const GOALS_MAX = 9;

function Stepper({ value, onChange, team }: { value: number; onChange: (v: number) => void; team: string }) {
  const btn =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 ring-1 ring-line transition-colors hover:bg-white/15 disabled:opacity-40";
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Gols do ${team}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={`Menos um gol do ${team}`}>
        <Minus size={16} aria-hidden />
      </button>
      <output className="w-8 text-center font-display text-5xl leading-none tabular" aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= GOALS_MAX} aria-label={`Mais um gol do ${team}`}>
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Simulador do confronto: o torcedor escolhe o placar da ida e da volta (jogo já disputado vem travado com o placar
 * real) e vê o placar somado e quem sobe, pela regra do regulamento. Sem modelo: é só a conta. As escolhas ficam na
 * URL (?c=1-2_1-1, na ordem de cada jogo) para compartilhar.
 */
export function ConfrontoSimulator({
  legs,
  better,
  fortalezaId,
  teams,
  crests,
  siteUrl,
  siteName,
}: {
  legs: SimLeg[];
  better: boolean;
  fortalezaId: string;
  teams: Record<string, TeamInfo>;
  crests: Record<string, string | null>;
  siteUrl: string;
  siteName: string;
}) {
  const [scores, setScores] = useState<LegScore[]>(() => legs.map((l) => l.final ?? { home: 0, away: 0 }));
  const [touched, setTouched] = useState(false);

  // escolhas vindas do link (?c=): só nos jogos que ainda não aconteceram
  useEffect(() => {
    const fromUrl = decodeConfronto(new URLSearchParams(window.location.search).get(CONFRONTO_PARAM));
    if (fromUrl.some((x) => x)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a URL uma vez, depois da hidratação
      setScores((cur) => cur.map((s, i) => (legs[i].final ? s : (fromUrl[i] ?? s))));
      setTouched(true);
    }
    // só na carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const param = encodeConfronto(scores);
  useEffect(() => {
    if (!touched) return;
    const url = new URL(window.location.href);
    url.searchParams.set(CONFRONTO_PARAM, param);
    window.history.replaceState(null, "", url);
  }, [param, touched]);

  function set(i: number, side: "home" | "away", v: number) {
    setTouched(true);
    setScores((cur) => cur.map((s, k) => (k === i ? { ...s, [side]: Math.max(0, Math.min(GOALS_MAX, v)) } : s)));
  }

  const forFocus = legs.map((l, i) =>
    l.homeId === fortalezaId ? { f: scores[i].home, o: scores[i].away } : { f: scores[i].away, o: scores[i].home },
  );
  const r = tieOutcome(better, forFocus);
  const oppId = legs[0].homeId === fortalezaId ? legs[0].awayId : legs[0].homeId;
  const opp = teams[oppId];
  const oppWith = `${opp.article} ${opp.name}`;
  const verdict = r.advances ? "O Leão sobe!" : `Quem sobe é ${oppWith}`;
  const reason = r.byTiebreak
    ? `Empate no placar somado: passa a melhor campanha, ${better ? "o Leão" : oppWith}.`
    : r.advances
      ? "O Leão fez mais gols somando os dois jogos."
      : `${opp.article === "a" ? "A" : "O"} ${opp.name} fez mais gols somando os dois jogos.`;
  const lines = legs.map((l, i) => `${teams[l.homeId].name} ${scores[i].home} x ${scores[i].away} ${teams[l.awayId].name}`);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <ol className="space-y-4">
        {legs.map((l, i) => (
          <li key={l.leg} className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
            <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{legName(l.leg)}</span>
              <span className="text-muted">{l.final ? "Placar real" : kickoffLabel(l.kickoffUtc)}</span>
            </p>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {[l.homeId, l.awayId].map((id, k) => (
                <div key={id} className={`flex flex-col items-center gap-2 text-center ${k === 1 ? "col-start-3" : ""}`}>
                  <span className="relative flex h-12 w-12 items-center justify-center">
                    {crests[id] && <Image src={crests[id]!} alt="" width={48} height={48} className="h-12 w-12 object-contain" />}
                  </span>
                  <span className={`text-sm leading-tight ${id === fortalezaId ? "font-bold" : "font-semibold"}`}>{teams[id].name}</span>
                  {l.final ? (
                    <span className="font-display text-5xl leading-none tabular">{k === 0 ? l.final.home : l.final.away}</span>
                  ) : (
                    <Stepper
                      value={k === 0 ? scores[i].home : scores[i].away}
                      onChange={(v) => set(i, k === 0 ? "home" : "away", v)}
                      team={teams[id].name}
                    />
                  )}
                </div>
              ))}
              <span className="col-start-2 row-start-1 font-display text-3xl text-muted" aria-hidden>
                x
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-6" aria-live="polite">
        <p className="text-sm font-semibold text-muted">Placar somado</p>
        <p className="font-display text-5xl leading-none">
          Fortaleza {r.f} x {r.o} {opp.name}
        </p>
        <p className={`mt-4 font-display text-6xl leading-none ${r.advances ? "text-win" : ""}`}>{verdict}</p>
        <p className="mt-2 text-white/90">{reason}</p>
        <p className="mt-4 text-sm text-muted">
          Sem pênaltis e sem gol fora de casa: vale só a soma dos gols. É a conta do regulamento, não uma previsão.
        </p>
        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          <ShareButton
            image={`/api/card/confronto?${CONFRONTO_PARAM}=${param}`}
            fileName="fortaleza-meu-confronto.png"
            link={`${siteUrl}/?${CONFRONTO_PARAM}=${param}#simulador`}
            text={`Meu palpite para o confronto: ${lines.join(" e ")}. ${verdict} Faça o seu no ${siteName}:`}
            event={{ name: "confronto_simulado" }}
          />
        </div>
      </div>
    </div>
  );
}

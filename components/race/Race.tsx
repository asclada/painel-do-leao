import { ChevronDown } from "lucide-react";
import { FormDots } from "@/components/ui/FormDots";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { FORTALEZA, race, teamById } from "@/lib/data";
import { accessChances } from "@/lib/clinch";
import { kickoffLabel, plural, shortDate, venueName } from "@/lib/format";
import type { RaceTeam } from "@/lib/generated/outputs";

const DIFFICULTY_STYLE = {
  Difícil: "bg-white text-bg",
  Média: "bg-surface-2 text-white ring-1 ring-white/25",
  Tranquila: "bg-transparent text-muted ring-1 ring-line",
} as const;

function TeamRow({ t }: { t: RaceTeam }) {
  const team = teamById[t.teamId];
  const ch = accessChances(t.teamId, t);
  const me = t.teamId === FORTALEZA;
  return (
    <li>
      <LazyDetails
        className={`group rounded-2xl ring-1 ${me ? "bg-red/10 ring-red" : "bg-surface ring-line"}`}
        summary={
          <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-2 p-3 sm:p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <span className="w-7 font-display text-2xl leading-none text-muted tabular">{t.position}º</span>
              <TeamBadge team={team} size="sm" />
              <span className={`min-w-0 flex-1 truncate ${me ? "font-bold" : "font-semibold"}`}>{team.name}</span>
              <span className="font-display text-3xl leading-none tabular">{t.points}</span>
              <span className="text-xs text-muted">pts</span>
              <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-10 text-sm">
              <FormDots form={t.form} size="sm" />
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLE[t.difficulty]}`}>
                Tabela {t.difficulty.toLowerCase()}
              </span>
              <span className="text-muted">Pega {t.remainingVsTop6} do G6</span>
            </div>
            {/* as duas chances do GE numa barra só: acesso direto (cheio) + ir aos playoffs (claro) */}
            <div className="pl-10">
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-[rgb(168_180_216/0.14)]"
                role="img"
                aria-label={`Acesso direto: ${ch.direct}. Ir aos playoffs: ${ch.playoffs}.`}
              >
                <span className={me ? "bg-win" : "bg-white"} style={{ width: `${t.pDirect * 100}%` }} />
                <span className="bg-white/35" style={{ width: `${t.pTop6 * 100}%` }} />
              </div>
              <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-sm" aria-hidden>
                <span className="text-muted">
                  Acesso direto <strong className={`tabular ${me ? "text-win" : "text-white"}`}>{ch.direct}</strong>
                </span>
                <span className="text-muted">
                  Playoffs <strong className="tabular text-white">{ch.playoffs}</strong>
                </span>
              </p>
            </div>
          </summary>
        }
      >
        <div className="border-t border-line px-3 pb-4 pt-3 text-sm sm:px-4">
          <p className="text-muted">
            Saldo de gols: <strong className="text-white">{t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}</strong>
          </p>
          <p className="mt-3 font-semibold">
            Faltam {plural(t.fixtures.length, "jogo")}: {t.remainingHome} em casa, {t.remainingAway} fora
          </p>
          <ul className="mt-2 divide-y divide-line">
            {t.fixtures.map((f) => {
              const opp = teamById[f.opponentId];
              return (
                <li key={f.matchId} className="flex items-center gap-3 py-2">
                  <span className="w-9 text-muted tabular">R{f.round}</span>
                  <TeamBadge team={opp} size="sm" />
                  <span className="min-w-0 flex-1 truncate">
                    {opp.name}
                    <span className="ml-2 text-xs text-muted">{f.home ? "casa" : "fora"}</span>
                    {f.opponentInTop6 && <span className="ml-2 text-xs font-semibold">G6</span>}
                  </span>
                  <span className="text-muted">{shortDate(f.kickoffUtc)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </LazyDetails>
    </li>
  );
}

/** F3 — Fortaleza contra os rivais diretos, lado a lado. */
export function Race() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <ol className="flex flex-col gap-2.5" aria-label="Times na briga pelo acesso">
        {race.teams.map((t) => (
          <TeamRow key={t.teamId} t={t} />
        ))}
      </ol>

      {race.headToHead.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold">Confrontos diretos que faltam</h3>
          <p className="mt-1 text-sm text-muted">Jogos entre os times da corrida: seis pontos em cada.</p>
          <ul className="mt-4 divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
            {race.headToHead.map((h) => {
              const home = teamById[h.homeId];
              const away = teamById[h.awayId];
              const mine = h.homeId === FORTALEZA || h.awayId === FORTALEZA;
              return (
                <li key={h.matchId} className="py-3">
                  <p className={`${mine ? "font-bold" : "font-semibold"}`}>
                    {home.name} x {away.name}
                  </p>
                  <p className="text-sm text-muted">
                    Rodada {h.round} · {kickoffLabel(h.kickoffUtc)}
                    {h.venue && ` · Estádio: ${venueName(h.venue)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

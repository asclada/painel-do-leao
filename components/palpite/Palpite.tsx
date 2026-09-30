"use client";

import {
  Check,
  ChevronDown,
  Eye,
  Flag,
  Flame,
  HeartHandshake,
  IdCard,
  Lightbulb,
  LifeBuoy,
  Lock,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Ticket,
  Wind,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { ShareButton } from "@/components/share/ShareButton";
import { LazyDetails } from "@/components/ui/LazyDetails";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { kickoffLabel, plural } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import {
  ACHIEVEMENTS,
  BACKUP_PARAM,
  backupUrl,
  decodeGuesses,
  GOALS_MAX,
  type Guess,
  mergeGuesses,
  type PalpiteGame,
  PTS_EXACT,
  PTS_RESULT,
  scoreAll,
  type Scored,
  scoreText,
  totalPoints,
  unlockedAchievements,
  verdictText,
} from "@/lib/palpite";
import { saveGuesses, useGuesses } from "@/lib/palpite-store";
import { trackUsage } from "@/lib/track";
import { useNow } from "@/lib/useNow";

type Props = {
  games: PalpiteGame[];
  open: PalpiteGame | null;
  teams: Record<string, Team>;
  crests: Record<string, string | null>;
  fortalezaId: string;
  siteUrl: string;
  siteName: string;
};

const ICONS: Record<string, LucideIcon> = {
  estreia: Ticket,
  "pe-quente": Flame,
  "olho-de-lince": Eye,
  "professor-pardal": Lightbulb,
  "fe-inabalavel": HeartHandshake,
  secador: Wind,
  carteirinha: IdCard,
  vidente: Sparkles,
  "ate-o-fim": Flag,
};

// a URL só existe no navegador: no servidor e na hidratação é "" (sem diferença de HTML)
const noSubscribe = () => () => {};
function useSearch() {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
}

/** "Palpite da rodada": placar do próximo jogo, pontos, histórico, conquistas e o link de backup. */
export function Palpite({ games, open, teams, crests, fortalezaId, siteUrl, siteName }: Props) {
  const guesses = useGuesses();
  const now = useNow();
  const search = useSearch();
  const [restoreDone, setRestoreDone] = useState(false);

  const fromLink = decodeGuesses(new URLSearchParams(search).get(BACKUP_PARAM));
  const scored = guesses ? scoreAll(guesses, games) : [];
  const unlocked = unlockedAchievements(scored);
  const names = (g: PalpiteGame) => {
    const opp = teams[g.opponentId];
    const fort = teams[fortalezaId];
    return g.home ? { home: fort, away: opp } : { home: opp, away: fort };
  };

  function restore() {
    saveGuesses(mergeGuesses(guesses ?? [], fromLink));
    trackUsage({ name: "backup_palpites", acao: "restaurado" });
    setRestoreDone(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(BACKUP_PARAM);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-6">
      {fromLink.length > 0 && guesses && !restoreDone && (
        <div className="flex flex-col gap-3 rounded-2xl bg-blue p-4 ring-1 ring-white/20 sm:flex-row sm:items-center">
          <LifeBuoy size={22} className="shrink-0" aria-hidden />
          <p className="flex-1">
            <strong>Este link traz {plural(fromLink.length, "palpite")} guardados.</strong> Quer trazer para este
            aparelho? Na mesma rodada, vale o palpite do link.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restore}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-bg"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={() => setRestoreDone(true)}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-white/40"
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6">
        {open ? (
          <OpenGame
            key={open.round}
            game={open}
            teams={names(open)}
            crests={crests}
            guesses={guesses}
            now={now}
            siteUrl={siteUrl}
            siteName={siteName}
          />
        ) : (
          <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="text-lg font-semibold">Os palpites dos pontos corridos acabaram.</p>
            <p className="mt-1 text-muted">Seus pontos e conquistas continuam aqui.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <MyPoints scored={scored} loading={!guesses} names={names} siteUrl={siteUrl} siteName={siteName} />
          {/* histórico e conquistas recolhidos: a seção fica com cerca de uma tela no celular */}
          <LazyDetails
            className="group rounded-2xl bg-surface ring-1 ring-line"
            summary={
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span className="flex-1">
                  {scored.length > 0 ? "Seus palpites e conquistas" : "Conquistas"}
                  {guesses && (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {unlocked.size} de {ACHIEVEMENTS.length}
                    </span>
                  )}
                </span>
                <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
            }
          >
            <div className="space-y-5 px-4 pb-4">
              {scored.length > 0 && <History scored={scored} names={names} />}
              <Achievements unlocked={unlocked} loading={!guesses} />
            </div>
          </LazyDetails>
          {guesses && guesses.length > 0 && <Backup guesses={guesses} siteUrl={siteUrl} siteName={siteName} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- jogo aberto

function Crest({ team, src }: { team: Team; src: string | null }) {
  return (
    <span className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
      {src ? (
        <Image src={src} alt={`Escudo do ${team.name}`} width={80} height={80} className="h-full w-full object-contain" />
      ) : (
        <TeamBadge team={team} size="lg" />
      )}
    </span>
  );
}

function Stepper({ value, onChange, team, disabled }: { value: number; onChange: (v: number) => void; team: string; disabled: boolean }) {
  const btn =
    "inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 ring-1 ring-line transition-colors hover:bg-white/15 disabled:opacity-40";
  return (
    <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label={`Gols do ${team}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= 0} aria-label={`Menos um gol do ${team}`}>
        <Minus size={18} aria-hidden />
      </button>
      <output className="w-9 text-center font-display text-6xl leading-none tabular sm:w-10" aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= GOALS_MAX} aria-label={`Mais um gol do ${team}`}>
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}

function OpenGame({
  game,
  teams,
  crests,
  guesses,
  now,
  siteUrl,
  siteName,
}: {
  game: PalpiteGame;
  teams: { home: Team; away: Team };
  crests: Record<string, string | null>;
  guesses: Guess[] | null;
  now: number | null;
  siteUrl: string;
  siteName: string;
}) {
  const mine = guesses?.find((g) => g.round === game.round) ?? null;
  const [editing, setEditing] = useState(false);
  const [h, setH] = useState<number | null>(null);
  const [a, setA] = useState<number | null>(null);
  const [saved, setSaved] = useState<"ok" | "memory" | null>(null);

  const kickoff = Date.parse(game.kickoffUtc);
  const locked = now !== null && now >= kickoff;
  const ready = guesses !== null && now !== null;
  const showForm = ready && !locked && (!mine || editing);
  // antes de ler o aparelho, o formulário aparece travado (mesma altura): a seção não cresce na hidratação,
  // o que tirava do lugar as âncoras das seções abaixo em celular lento
  const formShape = showForm || !ready;
  const homeGoals = h ?? mine?.home ?? 0;
  const awayGoals = a ?? mine?.away ?? 0;

  function save() {
    if (!guesses || Date.now() >= kickoff) return;
    const guess: Guess = { round: game.round, home: homeGoals, away: awayGoals, at: Math.floor(Date.now() / 1000) };
    const isNew = !mine;
    const ok = saveGuesses(mergeGuesses(guesses, [guess]));
    if (isNew) trackUsage({ name: "palpite_feito", rodada: game.round });
    setSaved(ok ? "ok" : "memory");
    setEditing(false);
    setH(null);
    setA(null);
  }

  const shown = mine && !editing ? { home: mine.home, away: mine.away } : { home: homeGoals, away: awayGoals };
  const line = scoreText(teams.home.name, teams.away.name, shown.home, shown.away);

  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-6">
      <p className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm text-white ring-1 ring-white/20">
          <span className="font-bold">Seu palpite</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-white/70" />
          <span>Rodada {game.round}</span>
        </span>
      </p>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-1 sm:gap-2">
        {([
          ["home", teams.home, homeGoals, setH],
          ["away", teams.away, awayGoals, setA],
        ] as const).map(([side, team, value, set]) => (
          <div key={side} className={`flex flex-col items-center gap-2 text-center ${side === "away" ? "col-start-3" : ""}`}>
            <Crest team={team} src={crests[team.id] ?? null} />
            <span className="text-base font-semibold leading-tight sm:text-lg">{team.name}</span>
            {formShape ? (
              <Stepper value={value} onChange={set} team={team.name} disabled={!ready} />
            ) : (
              <span className="font-display text-6xl leading-none tabular">{mine ? (side === "home" ? mine.home : mine.away) : "–"}</span>
            )}
          </div>
        ))}
        <span className="col-start-2 row-start-1 self-center pt-6 font-display text-3xl text-muted" aria-hidden>
          x
        </span>
      </div>

      <div className="mt-5 border-t border-line pt-4 text-center">
        {formShape && (
          <>
            <button
              type="button"
              onClick={save}
              disabled={!ready}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-red px-6 font-semibold text-white hover:bg-[#c81727] disabled:opacity-60"
            >
              <Check size={18} aria-hidden /> {mine ? "Salvar novo palpite" : "Cravar palpite"}
            </button>
            <p className="mt-3 text-sm text-muted">
              Dá para mudar até a bola rolar: {kickoffLabel(game.kickoffUtc)}. Placar exato vale {PTS_EXACT} pontos; só
              o resultado, {PTS_RESULT}.
            </p>
          </>
        )}

        {ready && mine && !editing && (
          <>
            <p className="text-lg font-semibold">
              {locked ? "Palpite fechado: " : "Palpite salvo: "}
              {line}
            </p>
            <p className="mt-1 text-sm text-muted">
              {locked
                ? "A bola já rolou. Os pontos aparecem aqui quando o resultado entrar no site."
                : saved === "memory"
                  ? "Este navegador não deixou guardar: o palpite vale só enquanto a aba estiver aberta."
                  : `Guardado neste aparelho. Dá para mudar até ${kickoffLabel(game.kickoffUtc)}.`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <ShareButton
                label="Compartilhar palpite"
                image={`/api/card/palpite?r=${game.round}&g=${mine.home}-${mine.away}`}
                fileName="fortaleza-meu-palpite.png"
                link={`${siteUrl}/#palpite`}
                text={`Cravei ${line}. E você, quanto crava? Dê seu palpite no ${siteName}:`}
              />
              {!locked && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 ring-white/40 hover:bg-white/10"
                >
                  <Pencil size={16} aria-hidden /> Mudar
                </button>
              )}
            </div>
          </>
        )}

        {ready && !mine && locked && (
          <p className="text-muted">
            A bola já rolou e os palpites deste jogo fecharam. O próximo abre assim que o resultado entrar no site.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pontos e histórico

function MyPoints({
  scored,
  loading,
  names,
  siteUrl,
  siteName,
}: {
  scored: Scored[];
  loading: boolean;
  names: (g: PalpiteGame) => { home: Team; away: Team };
  siteUrl: string;
  siteName: string;
}) {
  const total = totalPoints(scored);
  const done = scored.filter((s) => s.verdict);
  const exact = done.filter((s) => s.verdict?.exact).length;
  const last = done.at(-1);

  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <h3 className="text-sm font-semibold text-muted">Seus pontos</h3>
      {loading ? (
        // mesma altura do placar carregado: a seção não cresce na hidratação (isso tirava as âncoras do lugar)
        <>
          <p className="mt-1 font-display text-6xl leading-none text-muted sm:text-7xl" aria-hidden>
            –
          </p>
          <p className="text-sm text-muted">Carregando…</p>
        </>
      ) : (
        <>
          <p className="mt-1 font-display text-6xl leading-none sm:text-7xl">
            {total} <span className="text-3xl text-muted">{total === 1 ? "ponto" : "pontos"}</span>
          </p>
          <p className="text-sm text-muted">
            {done.length === 0
              ? "Os pontos entram depois de cada jogo do Leão."
              : `${plural(done.length, "jogo conferido", "jogos conferidos")} · ${plural(exact, "placar exato", "placares exatos")}`}
          </p>

          {last?.verdict && (
            <div className="mt-4 flex flex-col items-start gap-2 border-t border-line pt-4">
              <p className="text-sm">
                Último jogo: <strong>{verdictText(last.verdict)}</strong>
              </p>
              <ShareButton
                label="Compartilhar resultado"
                variant="outline"
                image={`/api/card/palpite?r=${last.game.round}&g=${last.guess.home}-${last.guess.away}&t=${total}&q=${done.length}`}
                fileName="fortaleza-meu-palpite-resultado.png"
                link={`${siteUrl}/#palpite`}
                text={`Cravei ${scoreText(names(last.game).home.name, names(last.game).away.name, last.guess.home, last.guess.away)} e fiz ${plural(last.verdict.points, "ponto")}. Dê seu palpite no ${siteName}:`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function History({ scored, names }: { scored: Scored[]; names: (g: PalpiteGame) => { home: Team; away: Team } }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">Seus palpites</h3>
      <ul className="mt-2 divide-y divide-line border-t border-line">
        {[...scored].reverse().map((s) => {
          const t = names(s.game);
          const onTime = s.guess.at * 1000 < Date.parse(s.game.kickoffUtc);
          return (
            <li key={s.guess.round} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-8 shrink-0 text-muted tabular">R{s.game.round}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {t.home.name} x {t.away.name}
                </span>
                <span className="block truncate text-muted">
                  Você: <strong className="text-white">{s.guess.home} x {s.guess.away}</strong>
                  {s.game.score ? ` · Deu: ${s.game.score.home} x ${s.game.score.away}` : " · aguardando o jogo"}
                  {!onTime && " · depois do apito, não vale"}
                </span>
              </span>
              {s.verdict && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-bold tabular ${
                    s.verdict.exact ? "bg-win text-bg" : s.verdict.result ? "bg-win/20 text-win" : "bg-surface-2 text-muted"
                  }`}
                >
                  {s.verdict.points > 0 ? `+${s.verdict.points}` : "0"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- conquistas

function Achievements({ unlocked, loading }: { unlocked: Set<string>; loading: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold">Conquistas</h3>
        {!loading && (
          <p className="text-sm text-muted">
            {unlocked.size} de {ACHIEVEMENTS.length}
          </p>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a.id);
          const Icon = got ? ICONS[a.id] : Lock;
          return (
            <li
              key={a.id}
              className={`flex gap-3 rounded-2xl p-3 ring-1 ${got ? "bg-surface-2 ring-win/60" : "bg-surface ring-line"}`}
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${got ? "bg-win text-bg" : "bg-bg text-muted"}`}
              >
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={`block font-semibold leading-tight ${got ? "" : "text-white/80"}`}>{a.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">
                  <span className="sr-only">{got ? "Conquistada: " : "Ainda não: "}</span>
                  {a.rule}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- backup

function Backup({ guesses, siteUrl, siteName }: { guesses: Guess[]; siteUrl: string; siteName: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-center">
      <LifeBuoy size={22} className="shrink-0 text-muted" aria-hidden />
      <p className="flex-1 text-sm text-white/90">
        <strong className="text-white">Não perca seus palpites.</strong> Eles ficam só neste aparelho (e o Safari do
        iPhone apaga depois de uns dias sem visita). Guarde o link: abrindo ele em qualquer celular, os palpites voltam.
      </p>
      <ShareButton
        label="Guardar meu link"
        variant="outline"
        link={backupUrl(siteUrl, guesses)}
        text={`Meus palpites do Leão no ${siteName} (link de backup):`}
        event={{ name: "backup_palpites", acao: "copiado" }}
      />
    </div>
  );
}

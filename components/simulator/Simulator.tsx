"use client";

import { ChevronUp, LoaderCircle, Lock, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PositionBars } from "@/components/simulator/PositionBars";
import { ShareButton } from "@/components/share/ShareButton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { TweenPct } from "@/components/ui/TweenPct";
import { shortDate } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import type { MagicNumbers, ScenarioResult } from "@/lib/generated/scenario";
import {
  type Choice,
  createScenarioRunner,
  isComplete,
  parseChoices,
  serializeChoices,
  warmUpWhenNear,
  writeChoicesToUrl,
} from "@/lib/simulator-client";
import { finalPoints, pG6, pointsPhrase, scenarioPhrase } from "@/lib/simulator-text";

export type SimFixture = { matchId: string; round: number; kickoffUtc: string; home: boolean; opponent: Team };

type Props = { fixtures: SimFixture[]; baseline: ScenarioResult; siteUrl: string; siteName: string };

/**
 * F4 — Simulador dos próximos jogos. O torcedor escolhe V/E/D em TODOS os jogos que faltam
 * (sem sorteio); só então o painel "Onde o Leão termina" é liberado. O HTML estático vem com
 * os jogos em aberto (fallback do Suspense); na hidratação, lê as escolhas de ?p= e continua dali.
 */
export function Simulator(props: Props) {
  const empty = Array<Choice>(props.fixtures.length).fill("-");
  return (
    <Suspense fallback={<SimulatorView {...props} initial={empty} />}>
      <SimulatorFromUrl {...props} />
    </Suspense>
  );
}

function SimulatorFromUrl(props: Props) {
  const params = useSearchParams();
  return <SimulatorView {...props} initial={parseChoices(params.get("p"), props.fixtures.length)} />;
}

const OPTIONS = [
  { c: "V", label: "Vitória", on: "bg-win text-bg ring-win" },
  { c: "E", label: "Empate", on: "bg-draw text-bg ring-draw" },
  { c: "D", label: "Derrota", on: "bg-loss text-white ring-loss" },
] as const;

function SimulatorView({ fixtures, baseline, siteUrl, siteName, initial }: Props & { initial: Choice[] }) {
  const [choices, setChoices] = useState<Choice[]>(initial);
  const [result, setResult] = useState<ScenarioResult>(baseline);
  const [loading, setLoading] = useState(isComplete(initial));
  const [error, setError] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [runner] = useState(() =>
    createScenarioRunner({
      onLoading: setLoading,
      onResult: (r) => {
        setResult(r);
        setError(null);
      },
      onError: setError,
    }),
  );

  // Link aberto com ?p= completo: simula na hora.
  useEffect(() => {
    if (isComplete(initial)) runner.request(serializeChoices(initial), { immediate: true });
    return () => runner.cancel();
    // só na montagem: as escolhas seguintes chegam pelos cliques
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aquece a função Python quando o simulador se aproxima; mostra o painel fixo só nesta seção.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const stopWarm = warmUpWhenNear(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(el);
    return () => {
      stopWarm();
      io.disconnect();
    };
  }, []);

  // Sem sorteio: o resultado só é calculado quando todos os jogos têm V, E ou D.
  function update(next: Choice[]) {
    setChoices(next);
    writeChoicesToUrl(next);
    if (isComplete(next)) {
      runner.request(serializeChoices(next));
    } else {
      runner.cancel();
      setLoading(false);
    }
  }

  function pick(i: number, c: Choice) {
    const next = [...choices];
    next[i] = next[i] === c ? "-" : c; // tocar de novo na mesma opção desfaz a escolha
    update(next);
  }

  const p = serializeChoices(choices);
  const chosen = choices.filter((c) => c !== "-").length;
  const complete = chosen === fixtures.length;
  const missing = fixtures.length - chosen;

  return (
    <div ref={rootRef} className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
      <div className="min-w-0 pb-24 lg:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Toque em <strong className="text-white">V</strong> (vitória do Leão), <strong className="text-white">E</strong>{" "}
            (empate) ou <strong className="text-white">D</strong> (derrota) em cada jogo.
          </p>
          <button
            type="button"
            onClick={() => update(fixtures.map(() => "-"))}
            disabled={chosen === 0}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-line transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={15} aria-hidden /> Limpar escolhas
          </button>
        </div>

        <ol className="mt-4 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line" aria-label="Jogos que faltam">
          {fixtures.map((f, i) => {
            const c = choices[i];
            return (
              <li key={f.matchId} className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                <TeamBadge team={f.opponent} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{f.opponent.name}</p>
                  <p className="truncate text-xs text-muted sm:text-sm">
                    R{f.round} · {f.home ? "Castelão" : "fora"}
                    <span className="hidden min-[400px]:inline"> · {shortDate(f.kickoffUtc)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 sm:gap-1.5" role="group" aria-label={`Resultado contra ${f.opponent.name}`}>
                  {OPTIONS.map((o) => {
                    const on = c === o.c;
                    return (
                      <button
                        key={o.c}
                        type="button"
                        aria-pressed={on}
                        aria-label={o.label}
                        title={o.label}
                        onClick={() => pick(i, o.c)}
                        className={`h-11 w-11 rounded-xl font-display min-[400px]:h-12 min-[400px]:w-12 text-2xl leading-none ring-1 transition-colors ${on ? o.on : "bg-bg/40 text-muted ring-line hover:bg-surface-2 hover:text-white"}`}
                      >
                        {o.c}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {complete
            ? "Todos os jogos escolhidos."
            : `${chosen} de ${fixtures.length} jogos escolhidos. ${missing === 1 ? "Falta 1" : `Faltam ${missing}`} para ver onde o Leão termina.`}
        </p>
      </div>

      <ResultPanel
        result={result}
        magic={baseline.magic}
        loading={loading}
        error={error}
        complete={complete}
        chosen={chosen}
        total={fixtures.length}
        onRetry={() => runner.request(p, { immediate: true })}
        inView={inView}
        open={open}
        setOpen={setOpen}
        share={
          <ShareButton
            label="Compartilhar minha previsão"
            image={`/api/card/previsao?p=${p}`}
            fileName="fortaleza-minha-previsao.png"
            link={`${siteUrl}/?p=${p}#simulador`}
            text={`Minha previsão para o Leão na Série B: ${finalPoints(result).value} pontos e ${Math.round(result.focus.pPromotion * 100)}% de chance de acesso. Faça a sua no ${siteName}:`}
            disabled={!complete || loading || !!error}
          />
        }
      />
    </div>
  );
}

function ResultPanel({
  result,
  magic,
  loading,
  error,
  complete,
  chosen,
  total,
  onRetry,
  inView,
  open,
  setOpen,
  share,
}: {
  result: ScenarioResult;
  /** marcas de pontos do cenário geral (20 mil simulações), comparadas com os pontos da previsão */
  magic: MagicNumbers;
  loading: boolean;
  error: string | null;
  /** todos os jogos têm resultado escolhido: só então o painel mostra números */
  complete: boolean;
  chosen: number;
  total: number;
  onRetry: () => void;
  inView: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  share: React.ReactNode;
}) {
  const pts = finalPoints(result);
  // o resultado guardado pode ser de um cenário anterior: enquanto o novo não chega, aparece apagado
  const hasResult = complete && !result.choices.includes("-");
  const ptsText = hasResult ? pointsPhrase(pts.value, magic) : null;
  const fade = loading ? "opacity-50" : "opacity-100";
  const missing = total - chosen;
  const lockedText =
    missing === total
      ? `Escolha o resultado dos ${total} jogos para ver onde o Leão termina.`
      : missing === 1
        ? "Falta 1 jogo: escolha o resultado para ver onde o Leão termina."
        : `Faltam ${missing} jogos: escolha todos para ver onde o Leão termina.`;

  const progress = (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
      <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${(chosen / total) * 100}%` }} />
    </div>
  );

  return (
    <aside
      aria-label="Onde o Leão termina"
      className={`z-30 transition-[translate,opacity,visibility] duration-300 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 lg:sticky lg:top-28 ${inView ? "" : "max-lg:invisible max-lg:translate-y-full"}`}
    >
      <div className="mx-auto max-w-[1100px] rounded-t-3xl bg-surface-2 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] ring-1 ring-white/15 lg:rounded-3xl lg:bg-surface lg:shadow-none lg:ring-line">
        {/* Barra resumida (só no celular) */}
        {!complete ? (
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 lg:hidden">
            <Lock size={20} className="shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{lockedText}</p>
              <div className="mt-2 flex items-center gap-2">
                {progress}
                <span className="shrink-0 text-xs text-muted tabular">
                  {chosen} de {total}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="sim-details"
            className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left lg:hidden"
          >
            {error ? (
              <span className="flex-1 text-sm font-semibold">Não deu para simular agora. Toque para tentar de novo.</span>
            ) : hasResult ? (
              <>
                <span className="flex-1">
                  <span className="block text-xs text-muted">Chance de subir</span>
                  <span className={`font-display text-4xl leading-none text-red transition-opacity ${fade}`}>
                    <TweenPct value={result.focus.pPromotion} />
                  </span>
                </span>
                <span className={`text-sm transition-opacity ${fade}`}>
                  <span className="block text-muted">
                    Direto{" "}
                    <strong className="text-white">
                      <TweenPct value={result.focus.pDirect} />
                    </strong>
                  </span>
                  <span className="block text-muted">
                    <strong className="text-white">{pts.value}</strong> pts · {result.mostLikelyPosition}º
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-sm font-semibold">Calculando onde o Leão termina…</span>
            )}
            {loading ? (
              <LoaderCircle size={20} className="animate-spin text-muted" aria-label="Calculando" />
            ) : (
              <ChevronUp size={22} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            )}
            <span className="sr-only">{open ? "Esconder detalhes" : "Ver detalhes"}</span>
          </button>
        )}

        <div
          id="sim-details"
          className={`max-h-[65vh] overflow-y-auto overscroll-contain px-4 pb-5 lg:block lg:max-h-none lg:overflow-visible lg:p-6 ${complete && open ? "" : "max-lg:hidden"}`}
        >
          <div className="hidden items-center justify-between lg:flex">
            <h3 className="text-lg font-semibold">Onde o Leão termina</h3>
            {complete && loading && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <LoaderCircle size={16} className="animate-spin" aria-hidden /> Calculando…
              </span>
            )}
          </div>

          {!complete ? (
            <div className="mt-4 hidden rounded-2xl bg-bg/50 p-5 lg:block">
              <Lock size={28} className="text-muted" aria-hidden />
              <p className="mt-3 text-lg font-semibold leading-snug">{lockedText}</p>
              <div className="mt-4 flex items-center gap-3">
                {progress}
                <span className="shrink-0 text-sm text-muted tabular">
                  {chosen} de {total}
                </span>
              </div>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl bg-bg/60 p-4 lg:mt-4">
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-bg"
              >
                <RotateCcw size={15} aria-hidden /> Tentar de novo
              </button>
            </div>
          ) : !hasResult ? (
            <p className="py-6 text-muted lg:mt-4">Calculando onde o Leão termina…</p>
          ) : (
            <div className={`transition-opacity ${fade}`} aria-busy={loading}>
              <div className="grid grid-cols-2 gap-4 lg:mt-4">
                <div>
                  <p className="text-sm text-muted">Pontos no fim</p>
                  <p className="font-display text-5xl leading-none tabular">{pts.value}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Posição mais provável</p>
                  <p className="font-display text-5xl leading-none tabular">{result.mostLikelyPosition}º</p>
                </div>
              </div>

              <div className="mt-4">
                <PositionBars dist={result.focus.positionDist} best={result.mostLikelyPosition} />
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
                <div>
                  <dt className="text-xs text-muted">Acesso</dt>
                  <dd className="font-display text-4xl leading-none text-red">
                    <TweenPct value={result.focus.pPromotion} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Direto (G2)</dt>
                  <dd className="font-display text-4xl leading-none">
                    <TweenPct value={result.focus.pDirect} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">No G6</dt>
                  <dd className="font-display text-4xl leading-none">
                    <TweenPct value={pG6(result)} />
                  </dd>
                </div>
              </dl>

              <p className="mt-4 font-semibold leading-snug" aria-live="polite">
                {scenarioPhrase(result)}
              </p>
              {ptsText && <p className="mt-2 text-sm text-muted">{ptsText}</p>}
            </div>
          )}

          {hasResult && !error && <div className="mt-5 flex flex-col gap-2">{share}</div>}
        </div>
      </div>
    </aside>
  );
}

"use client";

import { Check, Swords } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { ShareButton } from "@/components/share/ShareButton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import {
  choicesFor,
  cleanName,
  duelScore,
  finalPointsFor,
  type Pick,
  pickFor,
  type Player,
  NAME_MAX,
} from "@/lib/challenge";
import { pct, shortDate } from "@/lib/format";
import type { Team } from "@/lib/generated/outputs";
import { fetchScenario, serializeChoices } from "@/lib/simulator-client";
import type { UsageEvent } from "@/lib/track";

export type DuelFixture = { round: number; kickoffUtc: string; home: boolean; opponent: Team };
export type PlayedInfo = DuelFixture & { result: Pick };

const PICK_STYLE: Record<Pick, string> = {
  V: "bg-win text-bg",
  E: "bg-draw text-bg",
  D: "bg-loss text-white",
};

const NAME_KEY = "fen:apelido";

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* navegador sem armazenamento: tudo bem, só não lembra o apelido */
  }
}

/** Campo do apelido (lembrado no aparelho) + botão de compartilhar o link do desafio/duelo. */
export function NameShare({
  label,
  buildLink,
  text,
  image,
  fileName,
  event,
}: {
  label: string;
  buildLink: (name: string) => string;
  text: (name: string) => string;
  image?: (name: string) => string;
  fileName?: string;
  event?: UsageEvent;
}) {
  const id = useId();
  // só aparece depois que o torcedor escolhe todos os jogos (nunca no HTML do servidor): pode ler o aparelho já
  const [raw, setRaw] = useState(loadName);
  const name = cleanName(raw);

  return (
    <div className="rounded-2xl bg-bg/50 p-3">
      <label htmlFor={id} className="text-sm font-semibold">
        Seu apelido
      </label>
      <input
        id={id}
        value={raw}
        maxLength={NAME_MAX}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => name && saveName(name)}
        placeholder="Ex.: Lucas"
        autoComplete="nickname"
        className="mt-1 block min-h-11 w-full rounded-xl bg-surface px-3 text-base text-white ring-1 ring-line placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      />
      <div className="mt-2 flex">
        <ShareButton
          label={label}
          variant="light"
          link={name ? buildLink(name) : undefined}
          text={name ? text(name) : ""}
          image={name && image ? image(name) : undefined}
          fileName={fileName}
          disabled={!name}
          event={event}
        />
      </div>
    </div>
  );
}

/** Aviso no topo do simulador quando o link é um desafio ainda sem resposta. */
export function ChallengeBanner({ from, total }: { from: string; total: number }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-blue p-4 shadow-[0_4px_16px_rgb(29_78_216/0.45)] ring-1 ring-white/20">
      <Swords size={22} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="text-lg font-bold">{from} te desafiou!</p>
        <p className="text-sm text-white/90">
          Escolha o resultado dos {total} jogos que faltam. Quando terminar, a previsão de {from} aparece ao lado da sua e
          vocês veem quem conhece mais o Leão.
        </p>
      </div>
    </div>
  );
}

function PickChip({ pick, hit }: { pick: Pick | null; hit?: boolean }) {
  if (!pick) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-display text-lg leading-none ${PICK_STYLE[pick]}`}>
        {pick}
      </span>
      {hit && <Check size={14} className="text-win" aria-label="acertou" />}
    </span>
  );
}

/**
 * Os dois lado a lado: escolha de cada um por jogo, o resultado real dos jogos já disputados, placar de acertos,
 * pontos finais e a chance de acesso de cada previsão (mesma API do simulador).
 */
export function DuelPanel({
  a,
  b,
  fixtures,
  played,
  currentPoints,
}: {
  a: Player;
  b: Player;
  fixtures: DuelFixture[];
  played: PlayedInfo[];
  currentPoints: number;
}) {
  const remainingRounds = fixtures.map((f) => f.round);
  // só as rodadas que os dois previram (as mesmas do placar)
  const from = Math.max(a.picks.start, b.picks.start);
  const rows: (DuelFixture & { result: Pick | null })[] = [
    ...played.filter((g) => g.round >= from).map((g) => ({ ...g })),
    ...fixtures.map((f) => ({ ...f, result: null })),
  ].sort((x, y) => x.round - y.round);
  const score = duelScore(
    a.picks,
    b.picks,
    played.map((g) => ({ round: g.round, result: g.result })),
  );
  const nextGame = fixtures[0];

  // chance de acesso de cada previsão (a mesma API do simulador); a chave é o texto das escolhas, para não
  // refazer a busca a cada renderização (o objeto da previsão é recriado a partir da URL)
  const pa = serializeChoices(choicesFor(a.picks, remainingRounds));
  const pb = serializeChoices(choicesFor(b.picks, remainingRounds));
  const [chance, setChance] = useState<{ key: string; a: number; b: number } | null>(null);
  useEffect(() => {
    if (pa.includes("-") || pb.includes("-")) return;
    let alive = true;
    Promise.all([fetchScenario(pa), fetchScenario(pb)])
      .then(([ra, rb]) => alive && setChance({ key: `${pa}|${pb}`, a: ra.focus.pPromotion, b: rb.focus.pPromotion }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pa, pb]);
  const shownChance = chance?.key === `${pa}|${pb}` ? chance : null;

  const scoreText =
    score.counted > 0
      ? `${a.name} ${score.a} x ${score.b} ${b.name}`
      : nextGame
        ? `O placar começa no jogo contra ${nextGame.opponent.article === "a" ? "a" : "o"} ${nextGame.opponent.name} (${shortDate(nextGame.kickoffUtc)}).`
        : "Ninguém pontuou ainda.";

  return (
    <section aria-label={`Duelo: ${a.name} x ${b.name}`} className="mb-6 rounded-2xl bg-surface p-4 ring-1 ring-white/25 sm:p-5">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <Swords size={16} aria-hidden /> Quem conhece mais o Leão?
      </p>
      <h3 className="mt-1 font-display text-4xl leading-none">
        {a.name} <span className="text-muted">x</span> {b.name}
      </h3>
      <p className="mt-2 font-semibold">{scoreText}</p>
      {score.counted > 0 && (
        <p className="text-sm text-muted">
          Acertos {score.counted === 1 ? "no jogo já disputado" : `nos ${score.counted} jogos já disputados`} desde a
          previsão dos dois.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 pr-2 font-semibold">Jogo</th>
              <th className="px-2 py-2 text-center font-semibold">{a.name}</th>
              <th className="px-2 py-2 text-center font-semibold">{b.name}</th>
              <th className="py-2 pl-2 text-center font-semibold">Deu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const pa = pickFor(a.picks, r.round);
              const pb = pickFor(b.picks, r.round);
              return (
                <tr key={r.round}>
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-2">
                      <span className="w-8 text-muted tabular">R{r.round}</span>
                      <TeamBadge team={r.opponent} size="sm" />
                      <span className="min-w-0 truncate">
                        {r.opponent.name}
                        <span className="ml-1 text-xs text-muted">{r.home ? "casa" : "fora"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <PickChip pick={pa} hit={!!r.result && pa === r.result} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <PickChip pick={pb} hit={!!r.result && pb === r.result} />
                  </td>
                  <td className="py-2 pl-2 text-center">
                    {r.result ? <PickChip pick={r.result} /> : <span className="text-xs text-muted">a jogar</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
        {[a, b].map((p, i) => (
          <div key={i}>
            <dt className="truncate text-sm text-muted">{p.name}</dt>
            <dd className="font-display text-3xl leading-none">
              {finalPointsFor(p.picks, currentPoints, remainingRounds)} <span className="text-lg text-muted">pts</span>
            </dd>
            <dd className="text-sm text-muted">
              Chance de acesso:{" "}
              <strong className="text-win">{shownChance ? pct(i === 0 ? shownChance.a : shownChance.b) : "…"}</strong>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { ShareButton } from "@/components/share/ShareButton";
import { cleanName, NAME_MAX } from "@/lib/challenge";
import { pct } from "@/lib/format";
import { cardQuery, type FinishOption, type GameOption, PHRASE_OPTIONS, WHERE_OPTIONS } from "@/lib/meu-leao";
import { type PalpiteGame, scoreAll, totalPoints, unlockedAchievements } from "@/lib/palpite";
import { useGuesses } from "@/lib/palpite-store";

const NAME_KEY = "fen:apelido";
const noSubscribe = () => () => {};
function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

type Choice = { label: string; note?: string };

function Question({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice[];
  value: number | null;
  onChange: (i: number) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-lg font-semibold">{title}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <label
            key={i}
            className={`inline-flex min-h-11 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2 text-sm ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white ${
              value === i ? "bg-white text-bg ring-white" : "bg-surface ring-line hover:bg-surface-2"
            }`}
          >
            <input type="radio" name={name} className="sr-only" checked={value === i} onChange={() => onChange(i)} />
            <span className="font-semibold">{o.label}</span>
            {o.note && <span className={`text-xs ${value === i ? "text-bg/70" : "text-muted"}`}>{o.note}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** "Meu Leão": 4 perguntas com opções prontas (sem texto livre) viram um card de story. */
export function MeuLeao({
  games,
  finishes,
  palpiteGames,
  siteUrl,
  siteName,
}: {
  games: GameOption[];
  finishes: FinishOption[];
  palpiteGames: PalpiteGame[];
  siteUrl: string;
  siteName: string;
}) {
  const nameId = useId();
  const [where, setWhere] = useState<number | null>(null);
  const [game, setGame] = useState<number | null>(null);
  const [finish, setFinish] = useState<number | null>(null);
  const [phrase, setPhrase] = useState<number | null>(null);
  // apelido do "Desafio do Leão", se já existe no aparelho; o card só usa o nome quando o campo perde o foco
  const stored = useSyncExternalStore(noSubscribe, readName, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [committed, setCommitted] = useState<string | null>(null);
  const raw = typed ?? stored;
  const name = cleanName(committed ?? stored);

  const guesses = useGuesses();
  const scored = guesses ? scoreAll(guesses, palpiteGames) : [];
  // os pontos do palpite só entram no cartão depois de algum jogo conferido
  const palpite = scored.some((s) => s.verdict)
    ? { points: totalPoints(scored), achievements: unlockedAchievements(scored).size }
    : null;

  const missing = [where, game, finish, phrase].filter((v) => v === null).length;
  const complete = where !== null && game !== null && finish !== null && phrase !== null;
  const image = complete
    ? `/api/card/meu-leao?${cardQuery({ where, game: games[game].matchId, finish, phrase }, name, palpite)}`
    : null;

  function commitName() {
    const n = cleanName(raw);
    setCommitted(n ?? "");
    try {
      if (n) localStorage.setItem(NAME_KEY, n);
    } catch {
      /* sem armazenamento: só não lembra o apelido */
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div>
          <label htmlFor={nameId} className="text-lg font-semibold">
            Seu apelido <span className="text-sm font-normal text-muted">(opcional)</span>
          </label>
          <input
            id={nameId}
            value={raw}
            maxLength={NAME_MAX}
            onChange={(e) => setTyped(e.target.value)}
            onBlur={commitName}
            placeholder="Ex.: Lucas"
            autoComplete="nickname"
            className="mt-2 block min-h-11 w-full max-w-xs rounded-xl bg-surface px-3 text-base text-white ring-1 ring-line placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
        </div>
        <Question title="Onde você vê os jogos?" options={WHERE_OPTIONS.map((label) => ({ label }))} value={where} onChange={setWhere} />
        <Question
          title="O jogo inesquecível de 2026"
          options={games.map((g) => ({ label: g.line, note: `Rodada ${g.round} · ${g.tag}` }))}
          value={game}
          onChange={setGame}
        />
        <Question
          title="Pra você, onde o Leão termina?"
          options={finishes.map((f) => ({ label: f.label, note: `o modelo dá ${pct(f.chance)}` }))}
          value={finish}
          onChange={setFinish}
        />
        <Question title="Sua frase" options={PHRASE_OPTIONS.map((label) => ({ label }))} value={phrase} onChange={setPhrase} />
      </div>

      <div className="lg:sticky lg:top-32 lg:self-start">
        {image ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- card gerado sob demanda pelo next/og */}
            <img
              src={image}
              alt="Prévia do seu cartão Meu Leão"
              width={1080}
              height={1920}
              loading="lazy"
              className="aspect-[9/16] w-full max-w-[300px] rounded-2xl bg-bg ring-1 ring-line"
            />
            <ShareButton
              label="Compartilhar meu cartão"
              image={image}
              fileName="fortaleza-meu-leao.png"
              link={`${siteUrl}/#meu-leao`}
              text={`Esse é o meu Leão. Faça o seu cartão no ${siteName}:`}
            />
          </div>
        ) : (
          <div className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-line p-6 text-center text-muted lg:aspect-[9/16] lg:max-w-[300px]">
            {missing === 1 ? "Falta 1 resposta" : `Faltam ${missing} respostas`} para o seu cartão aparecer aqui.
          </div>
        )}
      </div>
    </div>
  );
}

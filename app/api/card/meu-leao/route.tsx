import { ImageResponse } from "next/og";
import { cleanName } from "@/lib/challenge";
import { PHRASE_OPTIONS, WHERE_OPTIONS } from "@/lib/meu-leao";
import { finishOptions, winById } from "@/lib/meu-leao-data";
import { MeuLeaoCard, STORY } from "@/lib/og/cards";
import { ogFonts } from "@/lib/og/fonts";
import { ACHIEVEMENTS } from "@/lib/palpite";

function index(raw: string | null, length: number) {
  if (raw === null || !/^\d$/.test(raw)) return null;
  const n = Number(raw);
  return n < length ? n : null;
}

function count(raw: string | null, max: number) {
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  return Math.min(Number(raw), max);
}

/**
 * Card de story "Meu Leão" (1080×1920): /api/card/meu-leao?v=0&j=fortaleza--goias&f=1&s=2 (+ &n=apelido e, se o
 * torcedor tem palpites, &pp=pontos&cq=conquistas). Só aceita opções prontas: índices das listas fixas, uma vitória
 * do Leão na temporada e um dos finais possíveis.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const finishes = finishOptions();
  const where = index(q.get("v"), WHERE_OPTIONS.length);
  const finish = index(q.get("f"), finishes.length);
  const phrase = index(q.get("s"), PHRASE_OPTIONS.length);
  const game = winById(q.get("j") ?? "");
  if (where === null || finish === null || phrase === null || !game) {
    return new Response("Cartão incompleto.", { status: 400 });
  }
  const pp = count(q.get("pp"), 5 * 38);
  const cq = count(q.get("cq"), ACHIEVEMENTS.length);
  return new ImageResponse(
    (
      <MeuLeaoCard
        name={cleanName(q.get("n"))}
        where={WHERE_OPTIONS[where]}
        game={game}
        finish={finishes[finish]}
        phrase={PHRASE_OPTIONS[phrase]}
        palpite={pp !== null && cq !== null ? { points: pp, achievements: cq } : null}
      />
    ),
    {
      ...STORY,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    },
  );
}

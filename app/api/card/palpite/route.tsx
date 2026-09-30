import { ImageResponse } from "next/og";
import { FORTALEZA } from "@/lib/data";
import { PalpiteCard, STORY } from "@/lib/og/cards";
import { crestDataUrl } from "@/lib/og/crests";
import { ogFonts } from "@/lib/og/fonts";
import { GOALS_MAX } from "@/lib/palpite";
import { palpiteGames } from "@/lib/palpite-data";

function int(raw: string | null, max: number) {
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= max ? n : null;
}

/**
 * Card de story do palpite (1080×1920): /api/card/palpite?r=31&g=2-1 (antes do jogo: o palpite e as chances do
 * modelo; depois: o placar real e os pontos). Opcional: &t=7&q=3 (pontos e palpites no total, vindos do aparelho).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const game = palpiteGames.find((g) => g.round === int(q.get("r"), 99));
  const m = /^(\d)-(\d)$/.exec(q.get("g") ?? "");
  if (!game || !m) return new Response("Palpite inválido.", { status: 400 });
  const guess = { home: Math.min(Number(m[1]), GOALS_MAX), away: Math.min(Number(m[2]), GOALS_MAX) };
  const t = int(q.get("t"), 5 * 38);
  const n = int(q.get("q"), 38);
  const homeId = game.home ? FORTALEZA : game.opponentId;
  const awayId = game.home ? game.opponentId : FORTALEZA;
  const [home, away] = await Promise.all([crestDataUrl(homeId), crestDataUrl(awayId)]);
  return new ImageResponse(
    <PalpiteCard game={game} guess={guess} crests={{ home, away }} total={t !== null && n ? { points: t, games: n } : null} />,
    {
      ...STORY,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    },
  );
}

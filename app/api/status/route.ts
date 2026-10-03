import { meta, nextMatch, simulation, standings, teams } from "@/lib/data";
import matchesJson from "@/data/matches.json";

/**
 * Estado publicado do site em JSON, só leitura: o que está NO AR agora (classificação, próximo jogo, chances, jogos e
 * hora da última atualização dos dados). Gerado no build, como o resto do site; por isso `builtAt` é a hora do deploy
 * e `commit` é o commit publicado. Serve para conferir o site em produção sem depender dos arquivos do repositório.
 */
export const dynamic = "force-static";

type MatchRow = {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  kickoffUtc: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export function GET() {
  const matches = (matchesJson as MatchRow[]).map((m) => ({
    id: m.id,
    round: m.round,
    homeId: m.homeId,
    awayId: m.awayId,
    kickoffUtc: m.kickoffUtc,
    status: m.status,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
  }));

  return Response.json(
    {
      meta,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      builtAt: new Date().toISOString(),
      teams: teams.map((t) => ({ id: t.id, name: t.name })),
      standings,
      nextMatch,
      simulation: {
        nSims: simulation.nSims,
        teams: simulation.teams.map((t) => ({
          teamId: t.teamId,
          pDirect: t.pDirect,
          pTop6: t.pTop6,
          pPromotion: t.pPromotion,
          pPlayoffPromotion: t.pPlayoffPromotion,
          pRelegation: t.pRelegation,
          pTitle: t.pTitle,
        })),
      },
      matches,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}

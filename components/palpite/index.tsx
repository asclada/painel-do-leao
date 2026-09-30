import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { Palpite } from "@/components/palpite/Palpite";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA, teamById } from "@/lib/data";
import { openGame, palpiteGames } from "@/lib/palpite-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Monta no servidor os jogos do palpite (placares, chances do modelo, rivais) e entrega ao cliente. */
export function PalpiteSection() {
  const ids = new Set([FORTALEZA, ...palpiteGames.map((g) => g.opponentId)]);
  const teams = Object.fromEntries([...ids].map((id) => [id, teamById[id]]));
  const crests = Object.fromEntries([...ids].map((id) => [id, id === FORTALEZA ? escudoFortaleza.src : crestSrc(id)]));
  return (
    <Palpite
      games={palpiteGames}
      open={openGame}
      teams={teams}
      crests={crests}
      fortalezaId={FORTALEZA}
      siteUrl={SITE_URL}
      siteName={SITE_NAME}
    />
  );
}

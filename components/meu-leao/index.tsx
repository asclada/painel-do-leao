import { MeuLeao } from "@/components/meu-leao/MeuLeao";
import { finishOptions, gameOptions } from "@/lib/meu-leao-data";
import { palpiteGames } from "@/lib/palpite-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Opções do cartão "Meu Leão" montadas no servidor com os dados do pipeline. */
export function MeuLeaoSection() {
  return (
    <MeuLeao
      games={gameOptions()}
      finishes={finishOptions()}
      palpiteGames={palpiteGames}
      siteUrl={SITE_URL}
      siteName={SITE_NAME}
    />
  );
}

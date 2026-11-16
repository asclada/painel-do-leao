import Image from "next/image";
import { ShareButton } from "@/components/share/ShareButton";
import { chanceChange, changeText } from "@/lib/chance";
import { accessChances } from "@/lib/clinch";
import { curiosityOfTheRound } from "@/lib/curiosities";
import { FORTALEZA, fortalezaOdds, nextMatch, playoffMode, playoffs, retro, teamById } from "@/lib/data";
import { kickoffLabel } from "@/lib/format";
import { advanceLabel, focus, focusTie, legForFocus } from "@/lib/playoffs";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Item = { key: string; title: string; image: string; fileName: string; text: string };

/**
 * "Conteúdo da rodada": 3–4 cards prontos para postar depois de cada jogo (o site não posta nada sozinho).
 * Todos se atualizam com os dados: a chance, a conta que mudou, o próximo jogo e uma curiosidade que roda a cada
 * rodada.
 */
export function RoundContent() {
  const items = playoffMode && focus ? playoffItems() : regularItems();
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => (
        <li key={it.key} className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-line">
          <p className="min-h-10 text-sm font-semibold leading-tight">{it.title}</p>
          <Image
            src={it.image}
            alt={`Prévia do card "${it.title}"`}
            width={1080}
            height={1920}
            unoptimized
            loading="lazy"
            sizes="(min-width: 1024px) 240px, 45vw"
            className="mt-2 aspect-[9/16] w-full rounded-xl bg-bg object-cover ring-1 ring-line"
          />
          <div className="mt-3 flex">
            <ShareButton compact={false} label="Postar" image={it.image} fileName={it.fileName} link={SITE_URL} text={it.text} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function nextMatchItem(): Item | null {
  if (!nextMatch) return null;
  const opp = teamById[nextMatch.opponentId];
  return {
    key: "proximo",
    title: "Próximo jogo",
    image: "/api/card/proximo-jogo",
    fileName: "fortaleza-proximo-jogo.png",
    text: `${nextMatch.home ? `Fortaleza x ${opp.name}` : `${opp.name} x Fortaleza`}, ${kickoffLabel(nextMatch.kickoffUtc)}. As chances do Leão no ${SITE_NAME}:`,
  };
}

/** Playoffs: chance de subir, a conta depois da ida, o próximo jogo e a retrospectiva da campanha. */
function playoffItems(): Item[] {
  if (!focus) return [];
  const opp = teamById[focus.opponentId];
  const items: Item[] = [
    {
      key: "acesso",
      title: "Chance de subir",
      image: "/api/card/acesso",
      fileName: "fortaleza-chance-de-subir.png",
      text: `Chance de o Fortaleza subir para a Série A passando pelo ${opp.name}, segundo o ${SITE_NAME}: ${advanceLabel(focus.pAdvance)}.`,
    },
  ];
  const first = focusTie?.legs.find((l) => l.leg === 1);
  if (playoffs?.state === "between_legs" && first && legForFocus(first)) {
    items.push({
      key: "conta",
      title: "A conta mudou",
      image: "/api/card/conta",
      fileName: "fortaleza-a-conta-mudou.png",
      text: `Depois da ida, a chance de o Fortaleza subir ${changeText({ from: focus.pAdvanceStart, to: focus.pAdvance })}, segundo o ${SITE_NAME}.`,
    });
  }
  const next = nextMatchItem();
  if (next) items.push(next);
  if (retro) {
    items.push({
      key: "retrospectiva",
      title: "A campanha em momentos",
      image: "/api/card/retrospectiva",
      fileName: "fortaleza-retrospectiva.png",
      text: `A campanha do Fortaleza na Série B em momentos, no ${SITE_NAME}:`,
    });
  }
  if (items.length < 4) {
    const cur = curiosityOfTheRound();
    items.push({
      key: "curiosidade",
      title: `Curiosidade: ${cur.title}`,
      image: `/api/card/curiosidade?t=${cur.id}`,
      fileName: `fortaleza-curiosidade-${cur.id}.png`,
      text: `${cur.text} Mais números do Leão no ${SITE_NAME}:`,
    });
  }
  return items;
}

function regularItems(): Item[] {
  const change = chanceChange();
  const cur = curiosityOfTheRound();
  const ch = accessChances(FORTALEZA, fortalezaOdds);
  const items: Item[] = [
    {
      key: "acesso",
      title: "Chances de acesso",
      image: "/api/card/acesso",
      fileName: "fortaleza-chance-de-acesso.png",
      text: `Chances do Fortaleza na Série B, segundo o ${SITE_NAME}: acesso direto ${ch.direct} e ir aos playoffs ${ch.playoffs}.`,
    },
  ];
  if (change) {
    items.push({
      key: "conta",
      title: "A conta mudou",
      image: "/api/card/conta",
      fileName: "fortaleza-a-conta-mudou.png",
      text: `A chance de acesso direto do Fortaleza ${changeText(change.direct)} e a de ir aos playoffs ${changeText(change.playoffs)}, segundo o ${SITE_NAME}.`,
    });
  }
  const next = nextMatchItem();
  if (next) items.push(next);
  items.push({
    key: "curiosidade",
    title: `Curiosidade: ${cur.title}`,
    image: `/api/card/curiosidade?t=${cur.id}`,
    fileName: `fortaleza-curiosidade-${cur.id}.png`,
    text: `${cur.text} Mais números do Leão no ${SITE_NAME}:`,
  });

  return items;
}

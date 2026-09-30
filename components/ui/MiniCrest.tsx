import Image from "next/image";
import escudoFortaleza from "@/assets/escudo-fortaleza.png";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { crestSrc } from "@/lib/crests";
import { FORTALEZA } from "@/lib/data";
import type { Team } from "@/lib/generated/outputs";

/**
 * Escudo pequeno: o do Fortaleza é sempre o do topo do site (primeiro escudo oficial).
 * Tamanho fixo (e não `fill`): o Next gera só as versões 1x e 2x, em vez de uma lista de ~16 tamanhos por imagem no
 * HTML (eram ~1,4 KB por escudo; a página tem dezenas deles).
 */
export function MiniCrest({ team }: { team: Team }) {
  const src = team.id === FORTALEZA ? escudoFortaleza : crestSrc(team.id);
  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      {src ? <Image src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" /> : <TeamBadge team={team} size="sm" />}
    </span>
  );
}

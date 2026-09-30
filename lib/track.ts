"use client";

// Eventos de uso (Vercel Analytics, sem dado pessoal): quantos desafios, palpites e cards os torcedores fazem, para
// decidir com números sobre bingo, quiz e o pacote 4. Em desenvolvimento a biblioteca não envia nada.
import { track } from "@vercel/analytics";

export type UsageEvent =
  | { name: "desafio_criado" }
  | { name: "duelo_respondido" }
  | { name: "palpite_feito"; rodada: number }
  | { name: "cartao_gerado"; tipo: string }
  | { name: "backup_palpites"; acao: "copiado" | "restaurado" };

export function trackUsage({ name, ...props }: UsageEvent) {
  try {
    track(name, props);
  } catch {
    /* contagem é bônus: nunca atrapalha o torcedor */
  }
}

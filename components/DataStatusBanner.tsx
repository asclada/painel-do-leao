import { TriangleAlert } from "lucide-react";
import { meta } from "@/lib/data";
import { TZ } from "@/lib/format";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

/**
 * Aviso de dados atrasados: aparece quando a fonte dos resultados (ESPN) falha seguidamente e há jogo encerrado
 * sem resultado ainda (data/meta.json → dataStatus, calculado pelo pipeline a partir de data/raw/state.json).
 */
export function DataStatusBanner() {
  const status = meta.dataStatus;
  if (!status?.delayed) return null;
  const when = status.lastSuccessAt ? fmt.format(new Date(status.lastSuccessAt)).replace(",", " às") : null;
  return (
    <div role="status" className="mx-auto mt-3 flex max-w-[1100px] px-4">
      <p className="flex w-full items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm ring-1 ring-white/25">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong>Os resultados mais recentes podem estar faltando.</strong> A fonte dos dados está fora do ar
          {when ? `; dados atualizados até ${when}` : ""}. Assim que ela voltar, tudo se atualiza sozinho.
        </span>
      </p>
    </div>
  );
}

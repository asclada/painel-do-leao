import { meta, simulation } from "@/lib/data";

const PROVIDER_LABEL: Record<string, string> = { espn: "ESPN", footballsoccerapi: "Football Soccer API" };

function updatedLabel(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso)).replace(",", " às");
}

export function Footer() {
  const sims = simulation.nSims.toLocaleString("pt-BR");
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto max-w-[1100px] px-4 py-10 text-sm text-muted">
        <details id="como-calculamos" className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-white">
            Como calculamos?
          </summary>
          <div className="mt-2 max-w-2xl space-y-3 leading-relaxed">
            <p>
              Simulamos os jogos que faltam de todos os 20 times, {sims} vezes. Cada jogo é sorteado levando em conta o
              ataque e a defesa de cada time em casa e fora, com peso maior para os jogos mais recentes. Depois contamos
              em quantas dessas temporadas o Fortaleza terminou em cada posição.
            </p>
            <p>
              Ninguém sabe ao certo o quanto cada time é bom de verdade: com poucos jogos, uma fase boa ou ruim engana.
              Por isso, em cada simulação a força dos times também é sorteada, perto do que os resultados mostram (e
              mais perto da média da Série B quando há poucos jogos). Assim a conta inclui a sorte dos jogos e essa
              dúvida. A &quot;faixa mais provável&quot; de pontos é onde o Leão terminou em 8 de cada 10 simulações.
            </p>
            <p>
              Os playoffs também entram na conta: 3º x 6º e 4º x 5º, em ida e volta. Pelo regulamento, a melhor
              campanha decide em casa e, se o placar somado empatar, é ela quem sobe.
            </p>
            <p>É uma estimativa, não uma previsão garantida: futebol tem surpresa.</p>
          </div>
        </details>

        <div className="mt-8 flex flex-col gap-2">
          <p>Projeto independente de torcedor. Sem vínculo com o Fortaleza Esporte Clube.</p>
          <p>
            Dados: {PROVIDER_LABEL[meta.provider ?? ""] ?? meta.provider}. Atualizado em {updatedLabel(meta.updatedAt)}.
          </p>
          <p>Feito por Lucas.</p>
        </div>
      </div>
      <div className="tricolor h-1" aria-hidden />
    </footer>
  );
}

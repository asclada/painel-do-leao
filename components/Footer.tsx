import { calibration, meta, simulation } from "@/lib/data";

const PROVIDER_LABEL: Record<string, string> = { espn: "ESPN", footballsoccerapi: "Football Soccer API" };

// Redes do Lucas (pedido dele, 29/09)
const INSTAGRAM = "https://www.instagram.com/slucah";
const X_PROFILE = "https://twitter.com/ascladaz";

// Ícones desenhados aqui: a versão do lucide-react do projeto não traz logos de marcas.
function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
    </svg>
  );
}

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
              Para cada jogo que falta, o modelo calcula a chance de cada placar pela força de ataque e de defesa dos
              dois times, em casa e fora, com peso maior para os jogos mais recentes. Com essas chances, simulamos o
              resto do campeonato de todos os 20 times, {sims} vezes: o time mais forte vence mais vezes, mas não
              sempre, como no futebol de verdade. Depois contamos em quantas dessas temporadas o Fortaleza terminou em
              cada posição.
            </p>
            <p>
              Ninguém sabe ao certo o quanto cada time é bom de verdade: com poucos jogos, uma fase boa ou ruim engana.
              Por isso, a força de cada time varia um pouco de uma simulação para outra, sempre perto do que os
              resultados mostram (e mais perto da média da Série B quando há poucos jogos). Assim a conta inclui a
              imprevisibilidade de cada jogo e essa dúvida. A &quot;faixa mais provável&quot; de pontos é onde o Leão
              terminou em 8 de cada 10 simulações.
            </p>
            <p>
              O site mostra duas chances, como o GE: acesso direto (terminar em 1º ou 2º) e ir aos playoffs (terminar
              entre 3º e 6º). Os playoffs são 3º x 6º e 4º x 5º, em ida e volta; pelo regulamento, a melhor campanha
              decide em casa e, se o placar somado empatar, é ela quem sobe. Como o mata-mata são só dois jogos, a
              chance de passar por ele não é somada à de acesso direto.
            </p>
            <p>
              O gráfico &quot;Como a chance mudou&quot; refaz essa mesma conta depois de cada rodada, usando só os jogos
              disputados até ali. {calibration.summary}
            </p>
            <p>É uma estimativa, não uma previsão garantida: futebol tem surpresa.</p>
          </div>
        </details>

        <div className="mt-8 flex flex-col gap-2">
          <p>Projeto independente de torcedor. Sem vínculo com o Fortaleza Esporte Clube.</p>
          <p>
            Dados: {PROVIDER_LABEL[meta.provider ?? ""] ?? meta.provider}. Atualizado em {updatedLabel(meta.updatedAt)}.
          </p>
          <p>
            Feito por{" "}
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              Lucas
            </a>
            .
          </p>
          <div className="flex items-center gap-2">
            <span>Minhas redes sociais</span>
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram do Lucas"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <InstagramIcon />
            </a>
            <a href={X_PROFILE} target="_blank" rel="noopener noreferrer" aria-label="X (antigo Twitter) do Lucas"
              className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10">
              <XIcon />
            </a>
          </div>
        </div>
      </div>
      <div className="tricolor h-1" aria-hidden />
    </footer>
  );
}

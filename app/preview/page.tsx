// CHECKPOINT VISUAL 1 — opções reais (com os dados de verdade) para o Lucas escolher
// pelo celular. Esconder/remover antes do lançamento (ver PLANO, Dia 3).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Hero } from "@/components/hero/Hero";
import { SeasonChartSection } from "@/components/season-chart";
import { FormDots } from "@/components/ui/FormDots";
import { FONT_SETS } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Prévia do visual — Painel do Leão",
  robots: { index: false, follow: false },
};

const NAMES = ["Painel do Leão", "Termômetro do Leão", "Leão em Números"];

function Option({ tag, title, note, className = "", children }: {
  tag: string; title: string; note?: string; className?: string; children: ReactNode;
}) {
  return (
    <section className={`border-t-4 border-white/20 ${className}`}>
      <div className="mx-auto max-w-[1100px] px-4 pt-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-bg">
          Opção {tag}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PreviewPage() {
  return (
    <main className="pb-24">
      <div className="tricolor h-1" aria-hidden />
      <div className="mx-auto max-w-[1100px] px-4 py-8">
        <p className="text-sm text-muted">Checkpoint visual 1</p>
        <h1 className="mt-1 text-3xl font-bold">Escolha o visual do topo</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Tudo aqui usa os dados reais de hoje. Role até o fim e me responda com as letras/números escolhidos:
          fonte (A, B ou C), vermelho (1 ou 2), bolinha de derrota (X ou Y), nome do site e montanha-russa (M1 ou M2).
        </p>
      </div>

      <h2 className="mx-auto max-w-[1100px] px-4 pb-2 pt-6 font-display text-4xl">1. Fontes</h2>
      {FONT_SETS.map((f) => (
        <Option key={f.id} tag={f.id.toUpperCase()} title={`${f.display} (números e títulos) + ${f.text} (texto)`}
          className={`fontset-${f.id}`}>
          <Hero anchor={`fonte-${f.id}`} />
        </Option>
      ))}

      <h2 className="mx-auto max-w-[1100px] px-4 pb-2 pt-10 font-display text-4xl">2. Uso do vermelho</h2>
      <Option tag="1" title="Vermelho contido" note="Vermelho só na chance de subir. Mais sóbrio, o número grande da posição fica branco.">
        <Hero anchor="vermelho-1" accent="contained" />
      </Option>
      <Option tag="2" title="Vermelho presente" note="Posição em vermelho, chance num bloco vermelho e botão vermelho. Mais cara de estádio.">
        <Hero anchor="vermelho-2" accent="present" />
      </Option>

      <h2 className="mx-auto max-w-[1100px] px-4 pb-2 pt-10 font-display text-4xl">3. Bolinha de derrota</h2>
      <div className="mx-auto grid max-w-[1100px] gap-4 px-4 sm:grid-cols-2">
        {[
          ["X", "loss-dark", "Derrota escura (não disputa com o vermelho do clube)"],
          ["Y", "loss-red", "Derrota vermelha (mais fácil de ler, mas usa a cor do clube para o que é ruim)"],
        ].map(([tag, cls, note]) => (
          <div key={tag} className={`${cls} rounded-2xl bg-surface p-5 ring-1 ring-line`}>
            <p className="font-bold">Opção {tag}</p>
            <p className="text-sm text-muted">{note}</p>
            <div className="mt-4 flex flex-col gap-3">
              <FormDots form={["V", "D", "E", "D", "V"]} />
              <FormDots form={["D", "D", "V", "E", "E"]} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mx-auto max-w-[1100px] px-4 pb-2 pt-10 font-display text-4xl">4. Nome do site</h2>
      <div className="mx-auto grid max-w-[1100px] gap-4 px-4 sm:grid-cols-3">
        {NAMES.map((n, i) => (
          <div key={n} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            <div className="tricolor h-1" aria-hidden />
            <div className="p-5">
              <p className="text-sm text-muted">Nome {i + 1}</p>
              <p className="mt-1 font-display text-4xl leading-none">{n}</p>
              <p className="mt-2 text-sm text-muted">{n.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[̀-ͯ]/g, "")}.vercel.app</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mx-auto max-w-[1100px] px-4 pt-4 text-muted">Pode sugerir outro nome também.</p>

      <h2 className="mx-auto max-w-[1100px] px-4 pb-2 pt-12 font-display text-4xl">5. Montanha-russa (checkpoint 2)</h2>
      <p className="mx-auto max-w-[1100px] px-4 text-muted">
        Toque nos marcos e nos pontos. Dá para ligar as linhas dos rivais embaixo de cada gráfico.
      </p>
      {([
        ["M1", "result", "Pontos coloridos pelo resultado (verde vitória, cinza empate, escuro derrota) e faixas preenchidas G2/G6/Z4."],
        ["M2", "uniform", "Linha mais grossa e suave, pontos discretos, faixas só contornadas com o nome escrito."],
      ] as const).map(([tag, style, note]) => (
        <Option key={tag} tag={tag} title={style === "result" ? "Resultado em cada ponto" : "Linha limpa"} note={note}>
          <div className="mx-auto max-w-[1100px] px-4 py-6">
            <SeasonChartSection style={style} idPrefix={tag} />
          </div>
        </Option>
      ))}
    </main>
  );
}

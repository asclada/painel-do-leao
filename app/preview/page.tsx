import type { Metadata } from "next";

// CHECKPOINT VISUAL 3 — escolha do visual dos cards de compartilhar. Sai do ar depois da escolha.
export const metadata: Metadata = {
  title: "Prévia dos cards",
  robots: { index: false, follow: false },
};

const EXAMPLE = "VVEVVDV-";

const CARDS = [
  {
    title: "Card 1 — Chance de acesso",
    note: "Sai pelo botão Compartilhar do topo.",
    options: [
      { id: "A", name: "Placar", desc: "A chance de subir domina a tela, como no topo do site.", src: "/api/card/acesso?v=a" },
      { id: "B", name: "Pôster", desc: "Posição gigante, a montanha-russa da temporada e a barra da chance.", src: "/api/card/acesso?v=b" },
    ],
  },
  {
    title: "Card 2 — Minha previsão",
    note: `Sai do simulador. Exemplo com as escolhas ${EXAMPLE} (o último jogo ficou no sorteio).`,
    options: [
      { id: "A", name: "Lista", desc: "Cada jogo com o resultado escolhido, e os números embaixo.", src: `/api/card/previsao?p=${EXAMPLE}&v=a` },
      { id: "B", name: "Pôster", desc: "Pontos finais gigantes, jogos em ladrilhos e a chance por posição.", src: `/api/card/previsao?p=${EXAMPLE}&v=b` },
    ],
  },
];

export default function Preview() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-10">
      <h1 className="font-display text-5xl leading-none">Checkpoint visual 3</h1>
      <p className="mt-3 max-w-2xl text-lg text-white/90">
        Escolha uma opção de cada card (A ou B). As imagens são geradas na hora com os dados reais, no tamanho de story
        (1080×1920). Toque numa imagem para abrir em tela cheia.
      </p>
      {CARDS.map((c) => (
        <section key={c.title} className="mt-12">
          <h2 className="text-2xl font-semibold">{c.title}</h2>
          <p className="mt-1 text-muted">{c.note}</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {c.options.map((o) => (
              <figure key={o.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <a href={o.src} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.src} alt={`${c.title}, opção ${o.id}`} width={1080} height={1920} loading="lazy"
                    className="h-auto w-full rounded-xl" />
                </a>
                <figcaption className="mt-3 px-1">
                  <strong className="font-display text-3xl">Opção {o.id}</strong>{" "}
                  <span className="font-semibold">· {o.name}</span>
                  <p className="text-sm text-muted">{o.desc}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

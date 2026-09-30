// As seções abaixo do topo usam `content-visibility: auto` (classe .cv-auto): o navegador só desenha cada uma quando
// ela chega perto da tela, e até lá ela ocupa uma altura estimada. Isso deixa o carregamento bem mais leve (é o que
// conta na nota do Lighthouse), mas altura estimada no lugar da real pode tirar coisas do lugar. Este script (inline,
// roda enquanto a página carrega, antes do React) garante que nada fique fora do lugar:
//  1. antes de ir para uma âncora (#simulador do desafio, #palpite, menu), desenha de verdade as seções ACIMA dela,
//     e, se a página abriu com âncora, segura o destino no lugar enquanto fontes, imagens e a hidratação ajustam
//     alturas (até 2 s sem mudança, no máximo 10 s), soltando assim que o torcedor mexe na tela;
//  2. se a página foi recarregada ou aberta pelo "voltar" (o navegador vai restaurar a posição da rolagem), desenha
//     todas as seções de cara, para a posição restaurada ser a de antes;
//  3. no primeiro toque ou rolagem do torcedor, desenha as seções que faltam aos poucos, de cima para baixo, nos
//     intervalos livres do navegador. Em poucos segundos a página fica igual a uma sem a otimização, e ninguém vê
//     pulo ao rolar para cima (o Safari não compensa mudanças de altura acima da tela).
export const ANCHOR_REVEAL_SCRIPT = `(() => {
  const sections = [...document.querySelectorAll(".cv-auto")].filter((s) => s.id);
  const shown = new Set();
  let style = null;
  function apply() {
    if (!style) {
      style = document.createElement("style");
      document.head.appendChild(style);
    }
    style.textContent = [...shown].map((id) => "#" + CSS.escape(id) + "{content-visibility:visible}").join("");
  }
  function reveal(target) {
    let changed = false;
    for (const s of sections) {
      if (shown.has(s.id) || s === target || s.contains(target)) continue;
      if (s.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) {
        shown.add(s.id);
        changed = true;
      }
    }
    if (changed) apply();
  }
  function byHash(hash) {
    const id = (hash || "").slice(1);
    if (!id) return null;
    try {
      return document.getElementById(decodeURIComponent(id));
    } catch {
      return null;
    }
  }

  // 2. recarregou ou voltou: tudo desenhado antes de o navegador restaurar a rolagem
  const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  if (nav && (nav.type === "reload" || nav.type === "back_forward")) {
    sections.forEach((s) => shown.add(s.id));
    apply();
  }

  // 1. abriu com âncora
  const target = byHash(location.hash);
  if (target) {
    reveal(target);
    let hold = true;
    let settle = 0;
    const stop = () => {
      hold = false;
      ro.disconnect();
      clearTimeout(settle);
    };
    const align = () => {
      if (!hold) return;
      target.scrollIntoView({ behavior: "instant", block: "start" });
      clearTimeout(settle);
      settle = setTimeout(stop, 2000);
    };
    const ro = new ResizeObserver(align);
    ro.observe(document.body);
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((e) =>
      addEventListener(e, stop, { once: true, passive: true, capture: true }),
    );
    setTimeout(stop, 10000);
    align();
  }

  // 1. cliques em links internos: seções acima do destino desenhadas antes da rolagem suave
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      const t = a && byHash(a.getAttribute("href"));
      if (t) {
        reveal(t);
        t.getBoundingClientRect(); // aplica as alturas reais antes da rolagem do link
      }
    },
    true,
  );
  addEventListener("hashchange", () => {
    const t = byHash(location.hash);
    if (t) reveal(t);
  });

  // 3. depois do primeiro gesto, o resto aos poucos (uma seção por intervalo livre)
  const later = window.requestIdleCallback
    ? (fn) => requestIdleCallback(fn, { timeout: 1000 })
    : (fn) => setTimeout(fn, 150);
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    const queue = sections.filter((s) => !shown.has(s.id));
    const step = () => {
      const s = queue.shift();
      if (!s) return;
      if (!shown.has(s.id)) {
        shown.add(s.id);
        apply();
      }
      later(step);
    };
    later(step);
  };
  ["scroll", "wheel", "touchstart", "keydown", "pointerdown"].forEach((e) =>
    addEventListener(e, start, { once: true, passive: true, capture: true }),
  );
})();`;

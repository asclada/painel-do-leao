// Cliente do simulador "E se?" (F4): conversa com a FastAPI em /api/py/*.
// - debounce de 400ms após cada clique;
// - cancela a requisição anterior com AbortController;
// - aquece a função Python (/api/py/health) quando o simulador chega perto da tela;
// - guarda as respostas em memória (voltar a uma escolha já vista é instantâneo).
import type { ScenarioResult } from "@/lib/generated/scenario";

export type Choice = "V" | "E" | "D" | "-";

export const DEBOUNCE_MS = 400;
export const ERROR_MESSAGE = "Não deu para simular agora. Tente de novo em instantes.";

const VALID = /^[VED-]+$/;

/** Lê o parâmetro ?p= da URL; se não bater com o número de jogos, volta tudo em aberto. */
export function parseChoices(raw: string | null | undefined, games: number): Choice[] {
  const p = (raw ?? "").toUpperCase();
  if (p.length !== games || !VALID.test(p)) return Array(games).fill("-");
  return p.split("") as Choice[];
}

export function serializeChoices(choices: Choice[]) {
  return choices.join("");
}

export function isEmpty(choices: Choice[]) {
  return choices.every((c) => c === "-");
}

/** Mantém as escolhas na URL (?p=VVEDV-V-E) sem recarregar nem criar histórico novo. */
export function writeChoicesToUrl(choices: Choice[]) {
  const url = new URL(window.location.href);
  if (isEmpty(choices)) url.searchParams.delete("p");
  else url.searchParams.set("p", serializeChoices(choices));
  window.history.replaceState(window.history.state, "", url);
}

let warmed = false;

/** Acorda a função Python para o primeiro clique não pagar o cold start. */
export function warmUp() {
  if (warmed) return;
  warmed = true;
  fetch("/api/py/health", { cache: "no-store" }).catch(() => {
    warmed = false; // tenta de novo na próxima vez que o simulador aparecer
  });
}

/** Chama warmUp quando o elemento estiver a ~1 tela de distância. Devolve a função de limpeza. */
export function warmUpWhenNear(el: Element) {
  if (!("IntersectionObserver" in window)) {
    warmUp();
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        warmUp();
        io.disconnect();
      }
    },
    { rootMargin: "100% 0px" },
  );
  io.observe(el);
  return () => io.disconnect();
}

export async function fetchScenario(p: string, signal?: AbortSignal): Promise<ScenarioResult> {
  const res = await fetch(`/api/py/simular?p=${encodeURIComponent(p)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type Listener = {
  onLoading: (loading: boolean) => void;
  onResult: (result: ScenarioResult) => void;
  onError: (message: string) => void;
};

/**
 * Agenda simulações: cada `request` reinicia o debounce e cancela a anterior.
 * Só a última escolha do torcedor chega na tela.
 */
export function createScenarioRunner({ onLoading, onResult, onError }: Listener) {
  const cache = new Map<string, ScenarioResult>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
  }

  async function run(p: string) {
    controller = new AbortController();
    const { signal } = controller;
    try {
      const result = await fetchScenario(p, signal);
      cache.set(p, result);
      if (!signal.aborted) {
        onResult(result);
        onLoading(false);
      }
    } catch (e) {
      if (signal.aborted || (e as Error).name === "AbortError") return;
      onError(ERROR_MESSAGE);
      onLoading(false);
    }
  }

  return {
    /** `immediate` pula o debounce (ex.: botão "Tentar de novo" ou link aberto com ?p=). */
    request(p: string, { immediate = false } = {}) {
      cancel();
      const hit = cache.get(p);
      if (hit) {
        onResult(hit);
        onLoading(false);
        return;
      }
      onLoading(true);
      if (immediate) void run(p);
      else timer = setTimeout(() => void run(p), DEBOUNCE_MS);
    },
    /** Resultado já conhecido (ex.: o cenário sem escolhas, que vem do build). */
    seed(p: string, result: ScenarioResult) {
      cache.set(p, result);
    },
    cancel,
  };
}

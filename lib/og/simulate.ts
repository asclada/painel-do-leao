// Chamada à API do simulador a partir das rotas de card (mesma URL que o navegador usa: normalmente já está no
// cache da CDN). Devolve null se a API não responder a tempo.
import type { ScenarioResult } from "@/lib/generated/scenario";

export async function simulate(origin: string, p: string, x?: string | null): Promise<ScenarioResult | null> {
  const q = new URLSearchParams({ p });
  if (x) q.set("x", x);
  const res = await fetch(new URL(`/api/py/simular?${q.toString()}`, origin), {
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

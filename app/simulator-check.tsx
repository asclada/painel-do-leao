"use client";

import { useState } from "react";
import type { ScenarioResult } from "@/lib/generated/scenario";

export function SimulatorCheck({ games }: { games: number }) {
  const [p, setP] = useState("-".repeat(games));
  const [res, setRes] = useState<ScenarioResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  async function run(choices: string) {
    setP(choices);
    setErr(null);
    const t = performance.now();
    try {
      const r = await fetch(`/api/py/simular?p=${encodeURIComponent(choices)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRes(await r.json());
      setMs(Math.round(performance.now() - t));
    } catch (e) {
      setErr(`Não deu para simular agora. (${(e as Error).message})`);
    }
  }

  return (
    <div className="text-sm">
      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-3 py-2" onClick={() => run("-".repeat(games))}>Sem escolhas</button>
        <button className="rounded border px-3 py-2" onClick={() => run("V".repeat(games))}>Tudo vitória</button>
        <button className="rounded border px-3 py-2" onClick={() => run("E".repeat(games))}>Tudo empate</button>
        <button className="rounded border px-3 py-2" onClick={() => run("D".repeat(games))}>Tudo derrota</button>
      </div>
      <p className="mt-2">Escolhas: {p}</p>
      {err && <p>{err}</p>}
      {res && (
        <p>
          Pontos: {res.finalPointsMin}
          {res.finalPointsMax !== res.finalPointsMin && `–${res.finalPointsMax}`} · posição mais provável:{" "}
          {res.mostLikelyPosition}º · direto {Math.round(res.focus.pDirect * 100)}% · acesso{" "}
          {Math.round(res.focus.pPromotion * 100)}% · respondeu em {ms} ms
        </p>
      )}
    </div>
  );
}

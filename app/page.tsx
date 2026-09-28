// Página PROVISÓRIA (Dia 1): números principais em texto puro, para validar o
// fluxo ponta a ponta (dados do pipeline + API do simulador). O visual vem no Dia 2.
import { SimulatorCheck } from "@/app/simulator-check";
import {
  fortalezaOdds,
  fortalezaRow,
  meta,
  nextMatch,
  race,
  simulation,
  teamById,
  timeline,
  xray,
} from "@/lib/data";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function Home() {
  const opp = nextMatch ? teamById[nextMatch.opponentId] : null;
  return (
    <main className="mx-auto w-full max-w-2xl p-4 font-sans leading-relaxed">
      <h1 className="text-2xl font-bold">Painel do Leão (versão provisória)</h1>
      <p className="text-sm opacity-70">
        Dados: {meta.provider} · rodada concluída {meta.lastCompletedRound} · atualizado em {meta.updatedAt}
      </p>

      <h2 className="mt-6 text-xl font-bold">Agora</h2>
      <ul className="list-disc pl-5">
        <li>
          {fortalezaRow.position}º lugar, {fortalezaRow.points} pontos em {fortalezaRow.played} jogos
        </li>
        <li>{xray.streaks.currentLabel} · últimos 5: {xray.streaks.form.join(" ")}</li>
        <li>
          Chance de acesso: <strong>{pct(fortalezaOdds.pPromotion)}</strong> (direto {pct(fortalezaOdds.pDirect)}, via
          playoffs {pct(fortalezaOdds.pPlayoffPromotion)})
        </li>
        {simulation.magic.pointsFor90Direct && (
          <li>
            Com {simulation.magic.pointsFor90Direct} pontos, a chance de subir direto passa de 90%
            {simulation.magic.winsNeededDirect != null && ` (${simulation.magic.winsNeededDirect} vitórias nos ${simulation.magic.remainingGames} jogos que faltam)`}.
          </li>
        )}
        {nextMatch && opp && (
          <li>
            Próximo jogo: rodada {nextMatch.round}, {nextMatch.home ? `Fortaleza x ${opp.name}` : `${opp.name} x Fortaleza`}{" "}
            ({nextMatch.venue}) — {new Date(nextMatch.kickoffUtc).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}
            {nextMatch.firstTurn && ` · 1º turno: ${nextMatch.firstTurn}`}
          </li>
        )}
      </ul>

      <h2 className="mt-6 text-xl font-bold">Temporada</h2>
      <p>{timeline.headline}</p>
      <p className="text-sm">Posição por rodada: {timeline.points.map((p) => p.position).join(" · ")}</p>
      <ul className="list-disc pl-5 text-sm">
        {timeline.milestones.map((m) => (
          <li key={m.round}>{m.text}</li>
        ))}
      </ul>

      <h2 className="mt-6 text-xl font-bold">Corrida pelo acesso</h2>
      <p>{race.headline}</p>
      <ol className="pl-5">
        {race.teams.map((t) => (
          <li key={t.teamId}>
            {t.position}º {teamById[t.teamId].name} — {t.points} pts · {t.form.join("")} · tabela {t.difficulty} ·
            acesso {pct(t.pPromotion)}
          </li>
        ))}
      </ol>

      <h2 className="mt-6 text-xl font-bold">Raio-X</h2>
      <ul className="list-disc pl-5">
        {Object.entries(xray.insights).map(([k, v]) => (
          <li key={k}>{v}</li>
        ))}
      </ul>

      <h2 className="mt-6 text-xl font-bold">Simulador (teste da API)</h2>
      <SimulatorCheck games={simulation.magic.remainingGames} />
    </main>
  );
}

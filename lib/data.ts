// Leitura tipada dos JSON gerados pelo pipeline Python (lidos no build).
import metaJson from "@/data/meta.json";
import teamsJson from "@/data/teams.json";
import standingsJson from "@/data/standings.json";
import timelineJson from "@/data/timeline.json";
import xrayJson from "@/data/xray.json";
import raceJson from "@/data/race.json";
import nextMatchJson from "@/data/next-match.json";
import simulationJson from "@/data/simulation.json";
import historyJson from "@/data/history.json";
import modelJson from "@/data/model.json";
import type {
  HistoryEntry,
  Meta,
  NextMatch,
  Race,
  Simulation,
  StandingRow,
  Team,
  Timeline,
  XRay,
} from "@/lib/generated/outputs";
import type { ScenarioResult } from "@/lib/generated/scenario";

export const meta = metaJson as Meta;
export const teams = teamsJson as Team[];
export const standings = standingsJson as StandingRow[];
export const timeline = timelineJson as Timeline;
export const xray = xrayJson as XRay;
export const race = raceJson as Race;
export const nextMatch = nextMatchJson as NextMatch | null;
export const simulation = simulationJson as Simulation;
export const history = historyJson as HistoryEntry[];

export const teamById = Object.fromEntries(teams.map((t) => [t.id, t])) as Record<string, Team>;
export const FORTALEZA = meta.fortalezaId;
export const fortalezaRow = standings.find((r) => r.teamId === FORTALEZA)!;
export const fortalezaOdds = simulation.teams.find((t) => t.teamId === FORTALEZA)!;

// --- Simulador "E se?" (F4) ---
type ModelFile = {
  focusTeam: number;
  teams: string[];
  focusRemaining: number[];
  remaining: { id: string; home: number; away: number; round: number; kickoffUtc: string }[];
};
const model = modelJson as ModelFile;

export type FocusFixture = { matchId: string; round: number; kickoffUtc: string; opponentId: string; home: boolean };

/** Jogos restantes do Fortaleza na MESMA ordem que a API espera no parâmetro ?p= */
export const focusFixtures: FocusFixture[] = model.focusRemaining.map((j) => {
  const m = model.remaining[j];
  const home = m.home === model.focusTeam;
  return {
    matchId: m.id,
    round: m.round,
    kickoffUtc: m.kickoffUtc,
    opponentId: model.teams[home ? m.away : m.home],
    home,
  };
});

/** Cenário "sem escolhas" direto do build (20 mil simulações): bate com o topo e evita uma chamada. */
export const baselineScenario: ScenarioResult = {
  choices: "-".repeat(focusFixtures.length),
  nSims: simulation.nSims,
  fixedPoints: 0,
  finalPointsMin: simulation.magic.currentPoints,
  finalPointsMax: simulation.magic.currentPoints + 3 * focusFixtures.length,
  expectedPoints: fortalezaOdds.expectedPoints,
  mostLikelyPosition: fortalezaOdds.positionDist.indexOf(Math.max(...fortalezaOdds.positionDist)) + 1,
  focus: fortalezaOdds,
  magic: simulation.magic,
};

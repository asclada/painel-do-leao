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

import type { TimelinePoint } from "@/lib/generated/outputs";

// Checkpoint 2 (M1, ajustado pelo Lucas): linha branca; ponto verde na vitória, cinza no empate, vermelho na derrota.
export const RESULT_FILL = { V: "var(--win)", E: "var(--draw)", D: "var(--loss)" } as const;
export const TOTAL_ROUNDS = 38;

export type Row = { round: number; fort: number | null; point?: TimelinePoint } & Record<string, number | null | TimelinePoint | undefined>;

import { readableText } from "@/lib/color";
import type { Team } from "@/lib/generated/outputs";

const SIZES = {
  sm: "h-6 min-w-9 text-[11px]",
  md: "h-8 min-w-12 text-sm",
  lg: "h-11 min-w-16 text-lg",
} as const;

/** Sigla do clube na cor principal (sem escudos oficiais — ver PLANO, seção 10). */
export function TeamBadge({ team, size = "md" }: { team: Team; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-1.5 font-display leading-none tracking-wide ring-1 ring-white/15 ${SIZES[size]}`}
      style={{ background: team.color, color: readableText(team.color, team.textColor) }}
      title={team.name}
    >
      {team.shortName}
    </span>
  );
}

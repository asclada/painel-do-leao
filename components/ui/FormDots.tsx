const LABEL = { V: "vitória", E: "empate", D: "derrota" } as const;
const COLOR = { V: "bg-win", E: "bg-draw", D: "bg-loss" } as const;

/** Bolinhas dos últimos jogos, do mais antigo (esquerda) ao mais recente. */
export function FormDots({ form, size = "md" }: { form: ("V" | "E" | "D")[]; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`Últimos jogos: ${form.map((r) => LABEL[r]).join(", ")}`}
    >
      {form.map((r, i) => (
        <span key={i} className={`${dim} rounded-full ${COLOR[r]}`} title={LABEL[r]} />
      ))}
    </span>
  );
}

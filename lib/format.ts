// Formatação em pt-BR, sempre no fuso de Fortaleza.
export const TZ = "America/Fortaleza";

export function plural(n: number, singular: string, pluralForm?: string) {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** 0.664 -> "66%". Abaixo de 1% e acima de 99% não arredonda para 0/100, que soariam como certeza. */
export function pct(x: number) {
  const v = x * 100;
  if (v > 0 && v < 1) return "<1%";
  if (v < 100 && v > 99) return ">99%";
  return `${Math.round(v)}%`;
}

export function pctNumber(x: number) {
  return Math.round(x * 100);
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });

/** "sex., 02/10 · 21h35" */
export function kickoffLabel(iso: string) {
  const d = new Date(iso);
  const day = dayFmt.format(d).replace(",", "");
  const time = timeFmt.format(d).replace(":", "h").replace(/h00$/, "h");
  return `${day} · ${time}`;
}

export function shortDate(iso: string) {
  return shortFmt.format(new Date(iso));
}

/** "há 12 min", "há 3 h", "há 2 dias" */
export function relativeTime(iso: string, now: number = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${plural(Math.round(h / 24), "dia")}`;
}

export function ordinal(n: number) {
  return `${n}º`;
}

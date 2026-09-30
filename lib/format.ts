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

/**
 * Chance de acesso com uma casa decimal, no formato do GE: 0.3761 -> "37,6%" (decisão do Lucas, 30/09). Com 20 mil
 * simulações a margem é de ~0,7 ponto, então a segunda casa não seria confiável. Sem certeza na matemática, nunca
 * "100,0%" ou "0,0%": vira ">99,9%" ou "<0,1%" (o 100%/0% de verdade vem de chanceLabel, em lib/clinch.ts).
 */
export function pct1(x: number) {
  if (x === 0) return "0%";
  if (x === 1) return "100%";
  const v = x * 100;
  if (v > 0 && v < 0.05) return "<0,1%";
  if (v < 100 && v >= 99.95) return ">99,9%";
  return `${v.toFixed(1).replace(".", ",")}%`;
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

// Nome popular do estádio: "Arena Castelão" -> "Castelão", "Estádio Raimundo Sampaio (Independência)" -> "Independência",
// "Estádio dos Aflitos" -> "Aflitos". Usado sempre no formato "Estádio: {nome}".
const VENUE_OVERRIDES: Record<string, string> = { "Arena Castelão": "Castelão" };

export function venueName(venue: string) {
  if (VENUE_OVERRIDES[venue]) return VENUE_OVERRIDES[venue];
  const nick = venue.match(/\(([^)]+)\)\s*$/);
  if (nick) return nick[1];
  return venue.replace(/^Est[aá]dio\s+/i, "").replace(/^(Dr\.|da|do|dos|das)\s+/i, "") || venue;
}

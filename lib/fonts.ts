// Fontes candidatas do CHECKPOINT VISUAL 1. Cada uma vira uma variável CSS;
// as classes .fontset-* (globals.css) escolhem qual par vale para a página.
import { Anton, Bebas_Neue, DM_Sans, Inter, Manrope, Oswald } from "next/font/google";

export const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
export const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap", preload: false });
export const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap", preload: false });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", preload: false });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap", preload: false });

export const allFontVars = [bebas, anton, oswald, inter, manrope, dmSans].map((f) => f.variable).join(" ");

export const FONT_SETS = [
  { id: "a", display: "Bebas Neue", text: "Inter" },
  { id: "b", display: "Anton", text: "Manrope" },
  { id: "c", display: "Oswald", text: "DM Sans" },
] as const;
export type FontSetId = (typeof FONT_SETS)[number]["id"];

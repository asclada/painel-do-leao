// Fontes escolhidas no checkpoint visual 1: Bebas Neue (números e títulos) + Inter (texto).
import { Bebas_Neue, Inter } from "next/font/google";

export const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const fontVars = `${bebas.variable} ${inter.variable}`;

import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { allFontVars } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel do Leão — Fortaleza na Série B 2026",
  description: "Onde o Fortaleza está na Série B, a chance real de acesso e o simulador dos jogos que faltam.",
};

export const viewport: Viewport = {
  themeColor: "#081230",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${allFontVars} fontset-a loss-dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
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
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

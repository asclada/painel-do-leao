import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes lidas com fs pelas imagens do next/og (cards e Open Graph).
  outputFileTracingIncludes: {
    "/api/card/*": ["./assets/fonts/*.woff", "./assets/escudo-fortaleza.png", "./public/escudos/*.png"],
    "/opengraph-image": ["./assets/fonts/*.woff"],
    "/twitter-image": ["./assets/fonts/*.woff"],
  },
  // Em dev, /api/py/* vai para a FastAPI local (uvicorn na porta 8000).
  // Em produção, a Vercel roteia direto para a função Python.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/py/:path*",
        destination: "http://127.0.0.1:8000/api/py/:path*",
      },
    ];
  },
};

export default nextConfig;

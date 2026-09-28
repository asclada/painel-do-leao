import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

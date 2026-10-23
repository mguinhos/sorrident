// Endereço interno da API (usado pelo proxy same-origin do Next).
// Em produção na VPS, o padrão já aponta para o uvicorn rodando local.
const API_INTERNO = process.env.API_INTERNO ?? "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // relativo => o navegador chama o próprio host, sem CORS e sem expor a porta 8000
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNO}/api/:path*` }];
  },
};

export default nextConfig;

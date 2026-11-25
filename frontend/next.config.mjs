/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // relativo => o navegador chama o próprio host (/api/*), proxied em runtime por app/api/[...path]/route.ts
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  },
};

export default nextConfig;

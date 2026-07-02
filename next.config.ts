import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // evita refresh ao retornar foco (segundos)
    },
  },
  async headers() {
    // Páginas voltadas ao cliente (links privados) não devem ser indexadas por buscadores.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/acesso/:path*",   headers: noindex },
      { source: "/galeria/:path*",  headers: noindex },
      { source: "/recibo/:path*",   headers: noindex },
      { source: "/crm-contrato/:path*", headers: noindex },
      { source: "/campanha/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;

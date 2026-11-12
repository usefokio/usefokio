import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // evita refresh ao retornar foco (segundos)
    },
  },
  // Otimizador de imagens (/_next/image) usado pelos blocos do site: redimensiona (480/800/1200/1600px)
  // e entrega WebP a quem aceita (JPEG aos demais). Só fotos do nosso storage.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sites.usefokio.com.br" },
      { protocol: "https", hostname: "arquivos.usefokio.com.br" },
    ],
    deviceSizes: [480, 800, 1200, 1600],
    imageSizes: [],
    formats: ["image/webp"],
    qualities: [78],
    minimumCacheTTL: 31536000, // arquivos têm nome único: nunca mudam
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
      { source: "/pagar/:path*",    headers: noindex },
    ];
  },
};

export default nextConfig;

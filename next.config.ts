import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // evita refresh ao retornar foco (segundos)
    },
  },
};

export default nextConfig;

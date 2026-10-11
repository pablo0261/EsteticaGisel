import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js + deps mínimas) para la imagen Docker.
  output: "standalone",
  // Miniaturas de las vistas previas de cursos (YouTube).
  images: { remotePatterns: [new URL("https://i.ytimg.com/vi/**")] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

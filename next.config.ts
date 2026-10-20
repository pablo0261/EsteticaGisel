import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: politicaContenido() },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

/** Orígenes de imágenes, video y la API de YouTube. En desarrollo Next necesita eval. */
function politicaContenido(): string {
  let supabase = "";
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (base) supabase = new URL(base).origin;
  } catch {
    supabase = "";
  }
  const extra = supabase ? ` ${supabase}` : "";
  const script =
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    script,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://i.ytimg.com https://*.supabase.co${extra}`,
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co https://www.youtube.com https://www.youtube-nocookie.com${extra}`,
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    `media-src 'self' blob: https://*.supabase.co${extra}`,
  ].join("; ");
}

/**
 * Imágenes de la marca de cada cliente (bucket público "sitios" de Supabase). El host sale
 * de NEXT_PUBLIC_SUPABASE_URL, que Next carga del .env antes de evaluar esta configuración
 * (en dev y en el build; el build de Docker la recibe por el secret del .env.local).
 */
function imagenesDeSitios(): URL[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  return base ? [new URL(`${base}/storage/v1/object/public/sitios/**`)] : [];
}

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js + deps mínimas) para la imagen Docker.
  output: "standalone",
  // En desarrollo cada tenant es <slug>.localhost:3000 (otro origen para el dev server).
  allowedDevOrigins: ["*.localhost"],
  // Miniaturas de las vistas previas de cursos (YouTube) e imágenes de la marca (Supabase).
  images: { remotePatterns: [new URL("https://i.ytimg.com/vi/**"), ...imagenesDeSitios()] },
  experimental: {
    // El panel master sube una imagen por envío (hasta 2 MB, lo valida la action): margen
    // para el overhead del multipart. Por encima, Next corta el pedido con 413.
    // Es global: vale para todas las server actions, también las públicas (reservas,
    // login), que aceptan entonces cuerpos de hasta 3 MB.
    serverActions: { bodySizeLimit: "3mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

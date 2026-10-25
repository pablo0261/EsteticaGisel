/**
 * Cabeceras de seguridad de todas las respuestas. CSP y HSTS se arman acá para
 * poder testearlas sin levantar Next.
 */
export type OpcionesHeaders = {
  /** true en producción: HSTS y sin unsafe-eval. */
  produccion: boolean;
  supabaseUrl?: string;
};

function origenSupabase(supabaseUrl: string | undefined): string {
  const base = supabaseUrl?.trim();
  if (!base) return "";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

/** CSP: el sitio, YouTube (cursos) y el storage del proyecto. En desarrollo Next necesita eval. */
export function politicaContenido(opts: OpcionesHeaders): string {
  const supabase = origenSupabase(opts.supabaseUrl);
  const extra = supabase ? ` ${supabase}` : "";
  const script = opts.produccion
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
    ...(opts.produccion ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function headersDeSeguridad(opts: OpcionesHeaders): { key: string; value: string }[] {
  const headers = [
    { key: "Content-Security-Policy", value: politicaContenido(opts) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
  if (opts.produccion) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}

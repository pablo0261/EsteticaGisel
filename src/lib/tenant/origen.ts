import type { NextRequest } from "next/server";
import { configHost, resolverHost } from "./host";

const HOST_SEGURO = /^[a-z0-9.-]+(?::\d{1,5})?$/i;

/**
 * Origen al que se puede redirigir al navegador. En los route handlers request.url
 * pierde el subdominio (queda localhost). Solo se acepta el Host si es de esta plataforma:
 * un host ajeno, aunque exista tenant por defecto, no se usa como destino.
 */
export function origenPublico(opts: {
  host: string | null;
  protocol: string;
  dominio: string;
  tenantPorDefecto?: string;
  fallback: string;
}): string {
  const host = opts.host?.trim().toLowerCase() ?? "";
  if (!HOST_SEGURO.test(host)) return opts.fallback;
  const dominio = opts.dominio.toLowerCase();
  const deLaPlataforma = host === dominio || host === `www.${dominio}` || host.endsWith(`.${dominio}`);
  if (!deLaPlataforma) return opts.fallback;
  const destino = resolverHost(host, { dominio: opts.dominio, tenantPorDefecto: opts.tenantPorDefecto });
  if (destino.tipo === "desconocido") return opts.fallback;
  const proto = opts.protocol === "https:" || opts.protocol === "https" ? "https" : "http";
  return `${proto}://${host}`;
}

export function origenDelRequest(request: NextRequest): string {
  const cfg = configHost();
  return origenPublico({
    host: request.headers.get("host"),
    protocol: request.nextUrl.protocol,
    dominio: cfg.dominio,
    tenantPorDefecto: cfg.tenantPorDefecto,
    fallback: request.nextUrl.origin,
  });
}

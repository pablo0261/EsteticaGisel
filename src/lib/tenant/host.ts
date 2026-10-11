/** Subdominios que nunca pueden ser un tenant. */
export const SUBDOMINIOS_RESERVADOS = ["www", "app", "admin", "master", "api"] as const;

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function esSlugValido(slug: string): boolean {
  return SLUG.test(slug) && !(SUBDOMINIOS_RESERVADOS as readonly string[]).includes(slug);
}

export type Destino =
  | { tipo: "tenant"; slug: string }
  | { tipo: "master" }
  | { tipo: "raiz" }
  | { tipo: "desconocido" };

export type ConfigHost = {
  /** Dominio de la plataforma, con puerto en desarrollo (ej. "localhost:3000"). */
  dominio: string;
  /** Tenant para hosts que no son de la plataforma (túneles, IP). */
  tenantPorDefecto?: string;
};

export function configHost(): ConfigHost {
  return {
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
    tenantPorDefecto: process.env.TENANT_POR_DEFECTO || undefined,
  };
}

/** A qué parte de la plataforma corresponde un host. */
export function resolverHost(host: string, cfg: ConfigHost): Destino {
  const h = host.trim().toLowerCase();
  const dominio = cfg.dominio.toLowerCase();

  if (h === dominio || h === `www.${dominio}`) return { tipo: "raiz" };

  if (h.endsWith(`.${dominio}`)) {
    const sub = h.slice(0, -(dominio.length + 1));
    if (sub === "app") return { tipo: "master" };
    return esSlugValido(sub) ? { tipo: "tenant", slug: sub } : { tipo: "desconocido" };
  }

  if (cfg.tenantPorDefecto && esSlugValido(cfg.tenantPorDefecto)) {
    return { tipo: "tenant", slug: cfg.tenantPorDefecto };
  }
  return { tipo: "desconocido" };
}

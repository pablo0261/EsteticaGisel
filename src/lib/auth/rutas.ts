/**
 * Rutas del login por área. El panel del cliente vive en <slug>.<dominio>/admin/… y el
 * master en la raíz de app.<dominio> (el proxy lo reescribe a /master/…). Puro: lo usa
 * el proxy.
 */
export type TipoArea = "tenant" | "master";

const BASES: Record<TipoArea, string> = { tenant: "/admin", master: "" };

/** Rutas relativas al área (las que no exigen la verificación completa). */
export const RUTAS_AUTH = {
  login: "/login",
  verificar: "/verificar",
  recuperar: "/recuperar",
  restablecer: "/restablecer",
} as const;

/** Ruta que ve el navegador: ("tenant", "/login") → "/admin/login"; ("master", "/") → "/". */
export function rutaDelArea(tipo: TipoArea, ruta: string): string {
  const base = BASES[tipo];
  if (ruta === "/") return base || "/";
  return `${base}${ruta}`;
}

/** Ruta relativa al área: ("tenant", "/admin/login") → "/login"; ("tenant", "/admin") → "/". */
export function rutaRelativa(tipo: TipoArea, pathname: string): string {
  const base = BASES[tipo];
  if (base === "") return pathname;
  if (pathname === base) return "/";
  // Otro prefijo (/administrator) no se recorta: queda una ruta que exige la verificación completa.
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

export type Decision = { tipo: "seguir" } | { tipo: "redirigir"; a: string };

/** Qué hace el proxy con un request a una ruta del área (relativa) según la sesión. */
export function decidirAcceso(ruta: string, estado: { haySesion: boolean; mfaValida: boolean }): Decision {
  const verificada = estado.haySesion && estado.mfaValida;
  if (ruta === RUTAS_AUTH.recuperar || ruta === RUTAS_AUTH.restablecer) return { tipo: "seguir" };
  if (ruta === RUTAS_AUTH.login) return verificada ? { tipo: "redirigir", a: "/" } : { tipo: "seguir" };
  if (!estado.haySesion) return { tipo: "redirigir", a: RUTAS_AUTH.login };
  if (ruta === RUTAS_AUTH.verificar) return verificada ? { tipo: "redirigir", a: "/" } : { tipo: "seguir" };
  return verificada ? { tipo: "seguir" } : { tipo: "redirigir", a: RUTAS_AUTH.verificar };
}

export type Perfil = { rol: "master" | "cliente"; tenant_id: string | null };

/** ¿Este perfil puede administrar este tenant? */
export function perfilAutorizado(perfil: Perfil | null, tenantId: string): boolean {
  if (!perfil) return false;
  return perfil.rol === "master" || perfil.tenant_id === tenantId;
}

export type AreaPerfil = { tipo: "master" } | { tipo: "tenant"; tenantId: string };

/** ¿Puede este perfil entrar a esta área? Al master, solo el master; al panel de un tenant, su cliente o el master. */
export function perfilPermitidoEnArea(perfil: Perfil | null, area: AreaPerfil): boolean {
  if (area.tipo === "master") return perfil?.rol === "master";
  return perfilAutorizado(perfil, area.tenantId);
}

export type Perfil = { rol: "master" | "cliente"; tenant_id: string | null };

/** ¿Este perfil puede administrar este tenant? */
export function perfilAutorizado(perfil: Perfil | null, tenantId: string): boolean {
  if (!perfil) return false;
  return perfil.rol === "master" || perfil.tenant_id === tenantId;
}

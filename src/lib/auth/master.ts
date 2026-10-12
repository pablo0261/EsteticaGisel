import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { perfilDe } from "./servicio";
import { sesionActual } from "./sesion";

/**
 * Master con la verificación en dos pasos completa. Lanza si no. sesionActual() valida la
 * sesión contra Supabase (getUser) y la cookie mfa; además el perfil tiene que ser master.
 * Se repite en el servidor por el mismo motivo que tenantDelAdmin: una action se puede
 * invocar desde cualquier ruta. Cada página y action del master lo llama.
 */
export const masterVerificado = cache(async (): Promise<{ userId: string }> => {
  const sesion = await sesionActual();
  if (!sesion?.verificada) throw new Error("No autorizado");
  const perfil = await perfilDe(sesion.userId);
  if (perfil?.rol !== "master") throw new Error("No autorizado");
  return { userId: sesion.userId };
});

export type TenantListado = { nombre: string; slug: string; estado: "activo" | "suspendido" };

/** Clientes de la plataforma, para la home master (solo lectura hasta la etapa C). */
export async function listarTenants(): Promise<TenantListado[]> {
  await masterVerificado();
  const { data, error } = await createAdminClient()
    .from("tenants")
    .select("nombre, slug, estado")
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as TenantListado[];
}

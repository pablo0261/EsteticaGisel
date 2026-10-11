import { datosDelTenant } from "@/lib/tenant/datos";
import type { ConfiguracionNegocio } from "./types";

export async function getConfiguracion(tenantId: string): Promise<ConfiguracionNegocio | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("configuracion_negocio")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as ConfiguracionNegocio;
}

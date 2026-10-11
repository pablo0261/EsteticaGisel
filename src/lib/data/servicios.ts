import { datosDelTenant } from "@/lib/tenant/datos";
import type { Servicio } from "./types";

/** Servicios activos del tenant para el sitio. Devuelve [] si la DB no responde. */
export async function getServiciosPublicos(tenantId: string): Promise<Servicio[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("servicios")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as unknown as Servicio[]) ?? [];
  } catch {
    return [];
  }
}

/** Todos los servicios del tenant, incluidos los inactivos (panel). */
export async function getServiciosAdmin(tenantId: string): Promise<Servicio[]> {
  const { data, error } = await datosDelTenant(tenantId).select("servicios").order("orden");
  if (error) throw new Error(error.message);
  return (data as unknown as Servicio[]) ?? [];
}

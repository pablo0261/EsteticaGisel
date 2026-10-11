import { datosDelTenant } from "@/lib/tenant/datos";
import type { Testimonio } from "./types";

/** Testimonios activos del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getTestimonios(tenantId: string): Promise<Testimonio[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("testimonios", "id, nombre, texto")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as unknown as Testimonio[]) ?? [];
  } catch {
    return [];
  }
}

import { datosDelTenant } from "@/lib/tenant/datos";
import type { Testimonio, TestimonioAdmin } from "./types";

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

/** Todos los testimonios del tenant, también los inactivos (panel). */
export async function getTestimoniosAdmin(tenantId: string): Promise<TestimonioAdmin[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("testimonios", "id, nombre, texto, orden, activo")
    .order("orden")
    .order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as TestimonioAdmin[]) ?? [];
}

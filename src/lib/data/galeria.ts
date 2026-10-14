import { datosDelTenant } from "@/lib/tenant/datos";
import type { ImagenGaleria } from "./types";

const COLUMNAS = "id, imagen_url, descripcion, orden, activo";

/** Imágenes activas del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getGaleriaPublica(tenantId: string): Promise<ImagenGaleria[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("galeria", COLUMNAS)
      .eq("activo", true)
      .order("orden")
      .order("creado_en");
    if (error) return [];
    return (data as unknown as ImagenGaleria[]) ?? [];
  } catch {
    return [];
  }
}

/** Todas las imágenes del tenant, también las ocultas (panel). */
export async function getGaleriaAdmin(tenantId: string): Promise<ImagenGaleria[]> {
  const { data, error } = await datosDelTenant(tenantId).select("galeria", COLUMNAS).order("orden").order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as ImagenGaleria[]) ?? [];
}

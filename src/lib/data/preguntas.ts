import { datosDelTenant } from "@/lib/tenant/datos";
import type { PreguntaFrecuente } from "./types";

const COLUMNAS = "id, pregunta, respuesta, orden, activo";

/** Preguntas activas del tenant, en orden. Devuelve [] si la DB no responde. */
export async function getPreguntasPublicas(tenantId: string): Promise<PreguntaFrecuente[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("preguntas_frecuentes", COLUMNAS)
      .eq("activo", true)
      .order("orden")
      .order("creado_en");
    if (error) return [];
    return (data as unknown as PreguntaFrecuente[]) ?? [];
  } catch {
    return [];
  }
}

/** Todas las preguntas del tenant, también las inactivas (panel). */
export async function getPreguntasAdmin(tenantId: string): Promise<PreguntaFrecuente[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("preguntas_frecuentes", COLUMNAS)
    .order("orden")
    .order("creado_en");
  if (error) throw new Error(error.message);
  return (data as unknown as PreguntaFrecuente[]) ?? [];
}

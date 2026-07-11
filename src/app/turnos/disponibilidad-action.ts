"use server";

import { getDisponibilidad, type SlotDisponible } from "@/lib/data/turnos";

export async function consultarDisponibilidad(
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0 || !fecha) return [];
  return getDisponibilidad(servicioIds, fecha);
}

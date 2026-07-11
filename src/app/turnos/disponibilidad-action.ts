"use server";

import { getDisponibilidad, type SlotDisponible } from "@/lib/data/turnos";

export async function consultarDisponibilidad(
  servicioId: string,
  fecha: string,
): Promise<SlotDisponible[]> {
  if (!servicioId || !fecha) return [];
  return getDisponibilidad(servicioId, fecha);
}

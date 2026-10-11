"use server";

import { getDisponibilidad, type SlotDisponible } from "@/lib/data/turnos";
import { tenantDelRequest } from "@/lib/tenant/actual";

export async function consultarDisponibilidad(
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0 || !fecha) return [];
  const tenant = await tenantDelRequest();
  if (!tenant?.modulos.turnos) return [];
  return getDisponibilidad(tenant.id, servicioIds, fecha);
}

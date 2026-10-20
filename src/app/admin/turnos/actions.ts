"use server";

import { revalidatePath } from "next/cache";
import { borrarEvento } from "@/lib/google-calendar/client";
import { cuentaGoogle } from "@/lib/integraciones/cuenta";
import { parsearId } from "@/lib/panel/formularios";
import { ir, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { Turno } from "@/lib/data/types";

const RUTA = "/admin/turnos";

export async function cancelarTurno(formData: FormData) {
  const tenant = await tenantDeAccion("turnos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const db = datosDelTenant(tenant.id);

  const { data: fila, error: errorLectura } = await db
    .select("turnos", "google_calendar_event_id, estado")
    .eq("id", id)
    .maybeSingle();
  if (errorLectura) ir(RUTA, { error: "error" });
  const turno = fila as unknown as Pick<Turno, "google_calendar_event_id" | "estado"> | null;
  if (!turno || (turno.estado !== "pendiente_pago" && turno.estado !== "confirmado")) ir(RUTA, { error: "id" });

  // Primero la cancelación condicional; el evento de Calendar se borra solo si el turno
  // realmente pasó a cancelado (con el id leído antes, porque el update lo deja en null).
  const { data, error } = await db
    .update("turnos", { estado: "cancelado", google_calendar_event_id: null })
    .eq("id", id)
    .in("estado", ["pendiente_pago", "confirmado"])
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });

  const cuenta = turno.google_calendar_event_id ? await cuentaGoogle(tenant.id, tenant.slug) : null;
  if (turno.google_calendar_event_id && cuenta) {
    try {
      await borrarEvento(turno.google_calendar_event_id, cuenta);
    } catch {
      // El turno ya quedó cancelado aunque falle Calendar.
    }
  }
  revalidatePath(RUTA);
  ir(RUTA, { ok: "turno_cancelado" });
}

export async function completarTurno(formData: FormData) {
  const tenant = await tenantDeAccion("turnos");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("turnos", { estado: "completado" })
    .eq("id", id)
    .eq("estado", "confirmado")
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidatePath(RUTA);
  ir(RUTA, { ok: "turno_completado" });
}

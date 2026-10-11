"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigurado, borrarEvento } from "@/lib/google-calendar/client";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { Turno } from "@/lib/data/types";

export async function cancelarTurnoAdmin(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);
  const id = String(formData.get("id"));

  const { data: fila } = await db
    .select("turnos", "google_calendar_event_id")
    .eq("id", id)
    .maybeSingle();
  const turno = fila as unknown as Pick<Turno, "google_calendar_event_id"> | null;

  if (turno?.google_calendar_event_id && isGoogleConfigurado()) {
    try {
      await borrarEvento(turno.google_calendar_event_id);
    } catch {
      // La cancelación sigue adelante aunque falle Calendar.
    }
  }

  await db.update("turnos", { estado: "cancelado", google_calendar_event_id: null }).eq("id", id);
  revalidatePath("/admin/turnos");
}

export async function marcarCompletado(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id)
    .update("turnos", { estado: "completado" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/turnos");
}

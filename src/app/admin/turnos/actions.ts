"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGoogleConfigurado, borrarEvento } from "@/lib/google-calendar/client";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
}

export async function cancelarTurnoAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();

  const { data: turno } = await db
    .from("turnos")
    .select("google_calendar_event_id")
    .eq("id", id)
    .single();

  if (turno?.google_calendar_event_id && isGoogleConfigurado()) {
    try {
      await borrarEvento(turno.google_calendar_event_id);
    } catch {
      // La cancelación sigue adelante aunque falle Calendar.
    }
  }

  await db
    .from("turnos")
    .update({ estado: "cancelado", google_calendar_event_id: null })
    .eq("id", id);
  revalidatePath("/admin/turnos");
}

export async function marcarCompletado(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  await db.from("turnos").update({ estado: "completado" }).eq("id", id);
  revalidatePath("/admin/turnos");
}

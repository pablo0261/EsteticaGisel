"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisponibilidad } from "@/lib/data/turnos";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { isGoogleConfigurado, crearEvento, borrarEvento } from "@/lib/google-calendar/client";

async function getTurnoGestionable(token: string) {
  const db = createAdminClient();
  const { data: turno } = await db
    .from("turnos")
    .select("*, servicios(nombre)")
    .eq("token_gestion", token)
    .single();
  if (!turno || turno.estado !== "confirmado") return null;

  const { data: config } = await db
    .from("configuracion_negocio")
    .select("horas_minimas_cancelacion")
    .eq("id", 1)
    .single();

  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });

  return { turno, permitido };
}

type AccionResult = { ok: true } | { ok: false; error: string };

export async function cancelarTurno(token: string): Promise<AccionResult> {
  const ctx = await getTurnoGestionable(token);
  if (!ctx || !ctx.permitido) {
    return { ok: false, error: "Fuera del plazo permitido para cancelar." };
  }

  const db = createAdminClient();
  if (ctx.turno.google_calendar_event_id && isGoogleConfigurado()) {
    try {
      await borrarEvento(ctx.turno.google_calendar_event_id);
    } catch {
      // La cancelación en la DB sigue adelante aunque falle Calendar.
    }
  }
  await db
    .from("turnos")
    .update({ estado: "cancelado", google_calendar_event_id: null })
    .eq("id", ctx.turno.id);

  revalidatePath(`/turnos/gestion/${token}`);
  return { ok: true };
}

export async function reprogramarTurno(
  token: string,
  nuevaFecha: string,
  nuevoIso: string,
): Promise<AccionResult> {
  const ctx = await getTurnoGestionable(token);
  if (!ctx || !ctx.permitido) {
    return { ok: false, error: "Fuera del plazo permitido para reprogramar." };
  }

  const disponibles = await getDisponibilidad(ctx.turno.servicio_id, nuevaFecha);
  if (!disponibles.some((s) => s.iso === nuevoIso)) {
    return { ok: false, error: "Ese horario ya no está disponible." };
  }

  const db = createAdminClient();
  let nuevoEventId: string | null = null;

  if (isGoogleConfigurado()) {
    try {
      if (ctx.turno.google_calendar_event_id) {
        await borrarEvento(ctx.turno.google_calendar_event_id);
      }
      const fin = new Date(
        new Date(nuevoIso).getTime() + ctx.turno.duracion_minutos * 60000,
      ).toISOString();
      nuevoEventId = await crearEvento({
        titulo: `${ctx.turno.servicios.nombre} — ${ctx.turno.cliente_nombre}`,
        descripcion: "Turno reprogramado.",
        inicioIso: nuevoIso,
        finIso: fin,
        clienteEmail: ctx.turno.cliente_email,
      });
    } catch {
      // Si Calendar falla, la reprogramación en la DB sigue adelante.
    }
  }

  await db
    .from("turnos")
    .update({ fecha_hora: nuevoIso, google_calendar_event_id: nuevoEventId })
    .eq("id", ctx.turno.id);

  revalidatePath(`/turnos/gestion/${token}`);
  return { ok: true };
}

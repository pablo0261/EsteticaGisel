"use server";

import { revalidatePath } from "next/cache";
import { getDisponibilidad } from "@/lib/data/turnos";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { isGoogleConfigurado, crearEvento, borrarEvento } from "@/lib/google-calendar/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import type { ConfiguracionNegocio, Turno } from "@/lib/data/types";

async function getTurnoGestionable(token: string) {
  const tenant = await tenantDelRequest();
  if (!tenant) return null;
  const db = datosDelTenant(tenant.id);

  const { data: fila } = await db
    .select("turnos", "*, servicios(nombre)")
    .eq("token_gestion", token)
    .maybeSingle();
  const turno = fila as unknown as (Turno & { servicios: { nombre: string } }) | null;
  if (!turno || turno.estado !== "confirmado") return null;

  const { data: filaConfig } = await db
    .select("configuracion_negocio", "horas_minimas_cancelacion")
    .maybeSingle();
  const config = filaConfig as unknown as Pick<
    ConfiguracionNegocio,
    "horas_minimas_cancelacion"
  > | null;

  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });

  return { tenant, db, turno, permitido };
}

type AccionResult = { ok: true } | { ok: false; error: string };

export async function cancelarTurno(token: string): Promise<AccionResult> {
  const ctx = await getTurnoGestionable(token);
  if (!ctx || !ctx.permitido) {
    return { ok: false, error: "Fuera del plazo permitido para cancelar." };
  }

  if (
    ctx.turno.google_calendar_event_id &&
    isGoogleConfigurado() &&
    usaCredencialesGlobales(ctx.tenant.slug)
  ) {
    try {
      await borrarEvento(ctx.turno.google_calendar_event_id);
    } catch {
      // La cancelación en la DB sigue adelante aunque falle Calendar.
    }
  }
  await ctx.db
    .update("turnos", { estado: "cancelado", google_calendar_event_id: null })
    .eq("id", ctx.turno.id);

  revalidatePath("/sitio/[tenant]/turnos/gestion/[token]", "page");
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

  const disponibles = await getDisponibilidad(ctx.tenant.id, [ctx.turno.servicio_id], nuevaFecha);
  if (!disponibles.some((s) => s.iso === nuevoIso)) {
    return { ok: false, error: "Ese horario ya no está disponible." };
  }

  let nuevoEventId: string | null = null;
  if (isGoogleConfigurado() && usaCredencialesGlobales(ctx.tenant.slug)) {
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

  await ctx.db
    .update("turnos", { fecha_hora: nuevoIso, google_calendar_event_id: nuevoEventId })
    .eq("id", ctx.turno.id);

  // La nueva fecha vuelve a recibir sus recordatorios.
  await ctx.db.delete("recordatorios_enviados").eq("turno_id", ctx.turno.id);

  revalidatePath("/sitio/[tenant]/turnos/gestion/[token]", "page");
  return { ok: true };
}

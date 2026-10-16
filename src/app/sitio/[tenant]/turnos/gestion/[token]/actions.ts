"use server";

import { revalidatePath } from "next/cache";
import { getDisponibilidad } from "@/lib/data/turnos";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { isGoogleConfigurado, crearEvento, borrarEvento } from "@/lib/google-calendar/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { IDIOMA_POR_DEFECTO, traducir, traductor } from "@/lib/i18n/textos";
import type { ConfiguracionNegocio, Turno } from "@/lib/data/types";
import type { Tenant } from "@/lib/tenant/tipos";

async function getTurnoGestionable(tenant: Tenant, token: string) {
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

  return { db, turno, permitido };
}

/** Tenant del host y la traducción a su idioma (español si no hay tenant). */
async function contexto() {
  const tenant = await tenantDelRequest();
  return { tenant, t: traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO) };
}

type AccionResult = { ok: true } | { ok: false; error: string };

export async function cancelarTurno(token: string): Promise<AccionResult> {
  const { tenant, t } = await contexto();
  const ctx = tenant?.modulos.turnos ? await getTurnoGestionable(tenant, token) : null;
  if (!tenant || !ctx || !ctx.permitido) {
    return {
      ok: false,
      error: t({
        es: "Fuera del plazo permitido para cancelar.",
        pt: "Fora do prazo permitido para cancelar.",
      }),
    };
  }

  if (
    ctx.turno.google_calendar_event_id &&
    isGoogleConfigurado() &&
    usaCredencialesGlobales(tenant.slug)
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
  const { tenant, t } = await contexto();
  const ctx = tenant?.modulos.turnos ? await getTurnoGestionable(tenant, token) : null;
  if (!tenant || !ctx || !ctx.permitido) {
    return {
      ok: false,
      error: t({
        es: "Fuera del plazo permitido para reprogramar.",
        pt: "Fora do prazo permitido para reagendar.",
      }),
    };
  }

  const noDisponible: AccionResult = {
    ok: false,
    error: t({
      es: "Ese horario ya no está disponible.",
      pt: "Esse horário não está mais disponível.",
    }),
  };
  const disponibles = await getDisponibilidad(
    tenant.id,
    tenant.zonaHoraria,
    [ctx.turno.servicio_id],
    nuevaFecha,
  );
  if (!disponibles.some((s) => s.iso === nuevoIso)) return noDisponible;

  // Chequeo y cambio atómicos (migración 0023), con el mismo lock por tenant que la reserva:
  // si otra reserva tomó el horario recién, no se mueve.
  const { data: movido, error } = await createAdminClient().rpc("reprogramar_turno", {
    p_tenant: tenant.id,
    p_turno: ctx.turno.id,
    p_fecha_hora: nuevoIso,
  });
  if (error || movido !== true) return noDisponible;

  let nuevoEventId: string | null = null;
  if (isGoogleConfigurado() && usaCredencialesGlobales(tenant.slug)) {
    try {
      if (ctx.turno.google_calendar_event_id) {
        await borrarEvento(ctx.turno.google_calendar_event_id);
      }
      const fin = new Date(
        new Date(nuevoIso).getTime() + ctx.turno.duracion_minutos * 60000,
      ).toISOString();
      nuevoEventId = await crearEvento({
        titulo: `${ctx.turno.servicios.nombre} — ${ctx.turno.cliente_nombre}`,
        descripcion: traducir(tenant.idioma, {
          es: "Turno reprogramado.",
          pt: "Agendamento reagendado.",
        }),
        inicioIso: nuevoIso,
        finIso: fin,
        clienteEmail: ctx.turno.cliente_email,
      });
    } catch {
      // Si Calendar falla, la reprogramación en la DB ya quedó hecha.
    }
  }
  await ctx.db.update("turnos", { google_calendar_event_id: nuevoEventId }).eq("id", ctx.turno.id);

  // La nueva fecha vuelve a recibir sus recordatorios.
  await ctx.db.delete("recordatorios_enviados").eq("turno_id", ctx.turno.id);

  revalidatePath("/sitio/[tenant]/turnos/gestion/[token]", "page");
  return { ok: true };
}

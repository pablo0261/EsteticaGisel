"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import { calcularMontoSena, puedeReservar } from "@/lib/turnos/reglas";
import { getClientIp } from "@/lib/turnos/ip";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import type { ConfiguracionNegocio, Servicio } from "@/lib/data/types";

export type ReservarTurnoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const tenant = await tenantDelRequest();
  if (!tenant?.modulos.turnos) {
    return { ok: false, error: "La reserva online no está disponible." };
  }

  const servicioIds = formData.getAll("servicioIds").map(String);
  const fecha = String(formData.get("fecha"));
  const iso = String(formData.get("iso"));
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (servicioIds.length === 0 || !iso || !clienteNombre || !clienteEmail || !clienteTelefono) {
    return { ok: false, error: "Completá todos los campos obligatorios." };
  }

  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono);
  if (!clienteWhatsApp) {
    return {
      ok: false,
      error: "El número de WhatsApp no es válido. Ingresalo con código de área, ej: 11 2345 6789.",
    };
  }

  if (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug)) {
    return {
      ok: false,
      error:
        "La reserva online con seña todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
    };
  }

  const db = datosDelTenant(tenant.id);
  const ip = await getClientIp();
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: intentos } = await db
    .select("intentos_reserva", "id")
    .eq("ip", ip)
    .gte("creado_en", haceUnaHora);

  if (!puedeReservar(intentos?.length ?? 0, MAXIMO_RESERVAS_POR_HORA)) {
    return {
      ok: false,
      error:
        "Por seguridad, alcanzaste el máximo de reservas por hora. Esperá una hora para volver a intentar.",
    };
  }

  // Re-verificar que el slot combinado sigue libre (evita choques por condición de carrera).
  const disponibles = await getDisponibilidad(tenant.id, servicioIds, fecha);
  if (!disponibles.some((s) => s.iso === iso)) {
    return { ok: false, error: "Ese horario ya no está disponible. Elegí otro." };
  }

  const { data: filasServicios } = await db
    .select("servicios", "id, nombre, duracion_minutos, precio, activo")
    .in("id", servicioIds);
  const serviciosSinOrden = filasServicios as unknown as
    | Pick<Servicio, "id" | "nombre" | "duracion_minutos" | "precio" | "activo">[]
    | null;
  const servicios = servicioIds
    .map((id) => serviciosSinOrden?.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (servicios.length !== servicioIds.length || servicios.some((s) => !s.activo)) {
    return { ok: false, error: "Alguno de los servicios elegidos no está disponible." };
  }

  const { data: filaConfig } = await db.select("configuracion_negocio", "sena_porcentaje").single();
  const config = filaConfig as unknown as Pick<ConfiguracionNegocio, "sena_porcentaje"> | null;
  if (!config) {
    return { ok: false, error: "No se pudo leer la configuración del negocio." };
  }

  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  let inicioActual = new Date(iso);
  const turnoIds: string[] = [];
  let montoSenaTotal = 0;

  for (const servicio of servicios) {
    const montoSena = calcularMontoSena(servicio.precio, config.sena_porcentaje);
    const { data: turno, error } = await db
      .insert("turnos", {
        servicio_id: servicio.id,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        cliente_telefono: clienteWhatsApp,
        fecha_hora: inicioActual.toISOString(),
        duracion_minutos: servicio.duracion_minutos,
        estado: "pendiente_pago",
        monto_sena: montoSena,
        bloqueado_hasta: bloqueadoHasta,
      })
      .select("id")
      .single();

    if (error || !turno) {
      // Revertir los turnos ya creados de esta reserva combinada.
      if (turnoIds.length > 0) await db.delete("turnos").in("id", turnoIds);
      return { ok: false, error: "No se pudo crear el turno. Probá de nuevo." };
    }

    turnoIds.push(turno.id);
    montoSenaTotal += montoSena;
    inicioActual = new Date(inicioActual.getTime() + servicio.duracion_minutos * 60000);
  }

  await db.insert("intentos_reserva", { ip });

  try {
    const titulo = `Seña — ${servicios.map((s) => s.nombre).join(" + ")}`;
    const pref = await crearPreferencia({
      titulo,
      monto: montoSenaTotal,
      externalReference: `turno:${turnoIds.join(",")}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: { success: "/turnos/gracias", pending: "/turnos/gracias", failure: "/turnos" },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    // Los turnos quedan pendiente_pago; el cron los libera a los 15 min si no se paga.
    return {
      ok: false,
      error: "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.",
    };
  }
}

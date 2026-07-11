"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDisponibilidad } from "@/lib/data/turnos";
import { calcularMontoSena } from "@/lib/turnos/reglas";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";

export type ReservarTurnoResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const servicioId = String(formData.get("servicioId"));
  const fecha = String(formData.get("fecha"));
  const iso = String(formData.get("iso"));
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (!servicioId || !iso || !clienteNombre || !clienteEmail) {
    return { ok: false, error: "Completá todos los campos obligatorios." };
  }

  if (!isMpConfigurado()) {
    return {
      ok: false,
      error:
        "La reserva online con seña todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
    };
  }

  // Re-verificar que el slot sigue libre (evita choques por condición de carrera).
  const disponibles = await getDisponibilidad(servicioId, fecha);
  if (!disponibles.some((s) => s.iso === iso)) {
    return { ok: false, error: "Ese horario ya no está disponible. Elegí otro." };
  }

  const db = createAdminClient();

  const { data: servicio } = await db
    .from("servicios")
    .select("nombre, duracion_minutos, precio, activo")
    .eq("id", servicioId)
    .single();
  if (!servicio || !servicio.activo) {
    return { ok: false, error: "Ese servicio no está disponible." };
  }

  const { data: config } = await db
    .from("configuracion_negocio")
    .select("sena_porcentaje")
    .eq("id", 1)
    .single();
  if (!config) {
    return { ok: false, error: "No se pudo leer la configuración del negocio." };
  }

  const montoSena = calcularMontoSena(servicio.precio, config.sena_porcentaje);
  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: turno, error } = await db
    .from("turnos")
    .insert({
      servicio_id: servicioId,
      cliente_nombre: clienteNombre,
      cliente_email: clienteEmail,
      cliente_telefono: clienteTelefono || null,
      fecha_hora: iso,
      duracion_minutos: servicio.duracion_minutos,
      estado: "pendiente_pago",
      monto_sena: montoSena,
      bloqueado_hasta: bloqueadoHasta,
    })
    .select("id")
    .single();

  if (error || !turno) {
    return { ok: false, error: "No se pudo crear el turno. Probá de nuevo." };
  }

  try {
    const pref = await crearPreferencia({
      titulo: `Seña — ${servicio.nombre}`,
      monto: montoSena,
      externalReference: `turno:${turno.id}`,
      clienteEmail,
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch {
    // El turno queda pendiente_pago; el cron lo libera a los 15 min si no se paga.
    return {
      ok: false,
      error: "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.",
    };
  }
}

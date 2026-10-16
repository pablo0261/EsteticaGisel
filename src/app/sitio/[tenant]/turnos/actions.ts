"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import type { ConfiguracionNegocio, Servicio } from "@/lib/data/types";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import { isMpConfigurado, crearPreferencia } from "@/lib/mercadopago/client";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { crearEventoDeTurno, enviarConfirmacionDeTurno } from "@/lib/turnos/confirmacion";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { getClientIp } from "@/lib/turnos/ip";
import { cobroDeReserva } from "@/lib/turnos/pago";
import { puedeReservar } from "@/lib/turnos/reglas";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";

/** url: el checkout de Mercado Pago, o la página de gracias si el turno ya quedó confirmado. */
export type ReservarTurnoResult = { ok: true; url: string } | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;

export async function reservarTurno(formData: FormData): Promise<ReservarTurnoResult> {
  const tenant = await tenantDelRequest();
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  if (!tenant?.modulos.turnos) {
    return {
      ok: false,
      error: t({ es: "La reserva online no está disponible.", pt: "O agendamento online não está disponível." }),
    };
  }

  const servicioIds = formData.getAll("servicioIds").map(String);
  const fecha = String(formData.get("fecha"));
  const iso = String(formData.get("iso"));
  const clienteNombre = String(formData.get("clienteNombre") || "").trim();
  const clienteEmail = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (servicioIds.length === 0 || !iso || !clienteNombre || !clienteEmail || !clienteTelefono) {
    return {
      ok: false,
      error: t({ es: "Completá todos los campos obligatorios.", pt: "Preencha todos os campos obrigatórios." }),
    };
  }

  const clienteWhatsApp = normalizarWhatsApp(clienteTelefono, tenant.pais);
  if (!clienteWhatsApp) {
    const ejemplo = EJEMPLO_WHATSAPP[tenant.pais];
    return {
      ok: false,
      error: t({
        es: `El número de WhatsApp no es válido. Ingresalo con código de área, ej.: ${ejemplo}.`,
        pt: `O número de WhatsApp não é válido. Informe com o código de área, ex.: ${ejemplo}.`,
      }),
    };
  }

  const db = datosDelTenant(tenant.id);
  const { data: filaConfig } = await db.select("configuracion_negocio", "sena_porcentaje, modo_pago").single();
  const config = filaConfig as unknown as Pick<ConfiguracionNegocio, "sena_porcentaje" | "modo_pago"> | null;
  if (!config) {
    return {
      ok: false,
      error: t({ es: "No se pudo leer la configuración del negocio.", pt: "Não foi possível ler a configuração do negócio." }),
    };
  }

  // Con pago anticipado hace falta Mercado Pago (hasta la etapa D, solo el tenant de las credenciales globales).
  if (config.modo_pago !== "ninguno" && (!isMpConfigurado() || !usaCredencialesGlobales(tenant.slug))) {
    return {
      ok: false,
      error: t({
        es: "La reserva online con pago todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "O agendamento online com pagamento ainda não está habilitado. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
    };
  }

  // Sin IP confiable (CABECERA_IP_CONFIABLE) no se limita por IP: no se junta a todos en un balde.
  const ip = await getClientIp();
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: intentos } = ip
    ? await db.select("intentos_reserva", "id").eq("ip", ip).gte("creado_en", haceUnaHora)
    : { data: [] };

  if (!puedeReservar(intentos?.length ?? 0, MAXIMO_RESERVAS_POR_HORA)) {
    return {
      ok: false,
      error: t({
        es: "Por seguridad, alcanzaste el máximo de reservas por hora. Esperá una hora para volver a intentar.",
        pt: "Por segurança, você atingiu o limite de agendamentos por hora. Aguarde uma hora para tentar novamente.",
      }),
    };
  }

  // Re-verificar que el slot combinado sigue libre (evita choques por condición de carrera).
  const disponibles = await getDisponibilidad(tenant.id, tenant.zonaHoraria, servicioIds, fecha);
  if (!disponibles.some((s) => s.iso === iso)) {
    return {
      ok: false,
      error: t({ es: "Ese horario ya no está disponible. Elegí otro.", pt: "Esse horário não está mais disponível. Escolha outro." }),
    };
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
    return {
      ok: false,
      error: t({
        es: "Alguno de los servicios elegidos no está disponible.",
        pt: "Um dos serviços escolhidos não está mais disponível.",
      }),
    };
  }

  const cobro = cobroDeReserva(config.modo_pago, config.sena_porcentaje, servicios.map((s) => s.precio), tenant.moneda);
  if (cobro.tipo === "sin_precio") {
    return {
      ok: false,
      error: t({
        es: "Los servicios elegidos no tienen precio para cobrar online. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "Os serviços escolhidos não têm preço para cobrança online. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
    };
  }
  // Sin pago anticipado, los turnos nacen confirmados; con pago, pendientes 15 minutos.
  const montos = cobro.tipo === "cobro" ? cobro.montos : null;
  const bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  let inicioActual = new Date(iso);
  const creados: { id: string; token_gestion: string; inicioIso: string }[] = [];
  for (const [i, servicio] of servicios.entries()) {
    const inicioIso = inicioActual.toISOString();
    const { data: turno, error } = await db
      .insert("turnos", {
        servicio_id: servicio.id,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        cliente_telefono: clienteWhatsApp,
        fecha_hora: inicioIso,
        duracion_minutos: servicio.duracion_minutos,
        estado: montos ? "pendiente_pago" : "confirmado",
        monto_sena: montos ? montos[i] : null,
        bloqueado_hasta: montos ? bloqueadoHasta : null,
      })
      .select("id, token_gestion")
      .single();

    if (error || !turno) {
      // Revertir los turnos ya creados de esta reserva combinada.
      if (creados.length > 0) await db.delete("turnos").in("id", creados.map((c) => c.id));
      return {
        ok: false,
        error: t({ es: "No se pudo crear el turno. Probá de nuevo.", pt: "Não foi possível criar o agendamento. Tente novamente." }),
      };
    }

    creados.push({ id: turno.id, token_gestion: turno.token_gestion, inicioIso });
    inicioActual = new Date(inicioActual.getTime() + servicio.duracion_minutos * 60000);
  }

  if (ip) await db.insert("intentos_reserva", { ip });

  if (!montos) {
    // Confirmado al reservar: el mismo evento de Calendar y email que el webhook de un pago aprobado.
    for (const [i, servicio] of servicios.entries()) {
      const confirmado = {
        slug: tenant.slug,
        idioma: tenant.idioma,
        zonaHoraria: tenant.zonaHoraria,
        servicio: servicio.nombre,
        clienteNombre,
        clienteEmail,
        fechaHoraIso: creados[i].inicioIso,
        duracionMinutos: servicio.duracion_minutos,
        tokenGestion: creados[i].token_gestion,
      };
      const eventId = await crearEventoDeTurno(confirmado, "Turno reservado online, sin pago anticipado.");
      if (eventId) await db.update("turnos", { google_calendar_event_id: eventId }).eq("id", creados[i].id);
      await enviarConfirmacionDeTurno(confirmado);
    }
    return { ok: true, url: `/turnos/gracias?turno=${creados[0].token_gestion}` };
  }

  try {
    const concepto = config.modo_pago === "total" ? t({ es: "Turno", pt: "Agendamento" }) : t({ es: "Seña", pt: "Sinal" });
    const pref = await crearPreferencia({
      titulo: `${concepto} — ${servicios.map((s) => s.nombre).join(" + ")}`,
      monto: cobro.tipo === "cobro" ? cobro.total : 0,
      moneda: tenant.moneda,
      externalReference: `turno:${creados.map((c) => c.id).join(",")}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: { success: "/turnos/gracias", pending: "/turnos/gracias", failure: "/turnos" },
    });
    return { ok: true, url: pref.initPoint };
  } catch {
    // Los turnos quedan pendiente_pago; el cron los libera a los 15 min si no se paga.
    return {
      ok: false,
      error: t({
        es: "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.",
        pt: "Não foi possível iniciar o pagamento. Tente novamente ou fale com a gente pelo WhatsApp.",
      }),
    };
  }
}

"use server";

import { getDisponibilidad } from "@/lib/data/turnos";
import type { ConfiguracionNegocio, Servicio } from "@/lib/data/types";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import { cuentaMercadoPago } from "@/lib/integraciones/cuenta";
import { crearPreferencia } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { crearEventoDeTurno, enviarConfirmacionDeTurno } from "@/lib/turnos/confirmacion";
import { LARGO_MAXIMO_NOMBRE_CLIENTE, validarEmailCliente, validarNombreCliente } from "@/lib/turnos/cliente";
import { EJEMPLO_WHATSAPP } from "@/lib/turnos/ejemplo-whatsapp";
import { bloqueadoSinIp, getClientIp } from "@/lib/turnos/ip";
import { cobroDeReserva } from "@/lib/turnos/pago";
import { puedeReservar } from "@/lib/turnos/reglas";
import { normalizarWhatsApp } from "@/lib/turnos/whatsapp";

/** url: el checkout de Mercado Pago, o la página de gracias si el turno ya quedó confirmado. */
export type ReservarTurnoResult = { ok: true; url: string } | { ok: false; error: string };

const MAXIMO_RESERVAS_POR_HORA = 2;
/**
 * Turnos futuros activos (confirmados, o pendientes de pago con el bloqueo vigente) que puede
 * tener un mismo email, y por separado un mismo WhatsApp, en un tenant. Sin pago anticipado
 * la reserva confirma al instante: este límite es el que frena llenar la agenda con datos de
 * otro. El límite por IP solo corre con CABECERA_IP_CONFIABLE: sin ella (o si el proxy no
 * manda la cabecera) la reserva igual se acepta y quedan estos límites por email y WhatsApp.
 */
const MAXIMO_TURNOS_FUTUROS_POR_CLIENTE = 3;
/** Servicios que se pueden combinar en una sola reserva (uno por turno, consecutivos). */
const MAXIMO_SERVICIOS_POR_RESERVA = 3;
/** Errores propios de reservar_turnos (migración 0023). */
const CODIGO_HORARIO_OCUPADO = "TU001";
const CODIGO_MAXIMO_POR_CLIENTE = "TU002";

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
  const nombreCrudo = String(formData.get("clienteNombre") || "").trim();
  const emailCrudo = String(formData.get("clienteEmail") || "").trim();
  const clienteTelefono = String(formData.get("clienteTelefono") || "").trim();

  if (servicioIds.length === 0 || !iso || !nombreCrudo || !emailCrudo || !clienteTelefono) {
    return {
      ok: false,
      error: t({ es: "Completá todos los campos obligatorios.", pt: "Preencha todos os campos obrigatórios." }),
    };
  }

  if (servicioIds.length > MAXIMO_SERVICIOS_POR_RESERVA) {
    return {
      ok: false,
      error: t({
        es: `Podés reservar hasta ${MAXIMO_SERVICIOS_POR_RESERVA} servicios juntos. Para más, escribinos por WhatsApp.`,
        pt: `Você pode agendar até ${MAXIMO_SERVICIOS_POR_RESERVA} serviços juntos. Para mais, fale com a gente pelo WhatsApp.`,
      }),
    };
  }

  const clienteNombre = validarNombreCliente(nombreCrudo);
  if (!clienteNombre) {
    return {
      ok: false,
      error: t({
        es: `Ingresá tu nombre, de hasta ${LARGO_MAXIMO_NOMBRE_CLIENTE} caracteres.`,
        pt: `Informe seu nome, com até ${LARGO_MAXIMO_NOMBRE_CLIENTE} caracteres.`,
      }),
    };
  }
  // Una sola dirección: es el destinatario del email de confirmación y el pagador en Mercado Pago.
  const clienteEmail = validarEmailCliente(emailCrudo);
  if (!clienteEmail) {
    return {
      ok: false,
      error: t({
        es: "Ingresá un solo email válido, ej.: nombre@dominio.com.",
        pt: "Informe um único e-mail válido, ex.: nome@dominio.com.",
      }),
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

  const mercadoPago = config.modo_pago === "ninguno" ? null : await cuentaMercadoPago(tenant.id, tenant.slug);
  // Con pago anticipado hacen falta el access token y el secreto del webhook de ESTE cliente.
  if (config.modo_pago !== "ninguno" && !mercadoPago) {
    return {
      ok: false,
      error: t({
        es: "La reserva online con pago todavía no está habilitada. Escribinos por WhatsApp para coordinar tu turno.",
        pt: "O agendamento online com pagamento ainda não está habilitado. Fale com a gente pelo WhatsApp para combinar seu horário.",
      }),
    };
  }

  // Sin IP confiable no se junta a todos en un balde. En producción, sin esa IP no se reserva:
  // si no, el límite de 2 por hora no existe.
  const ip = await getClientIp();
  if (bloqueadoSinIp(process.env.NODE_ENV, ip)) {
    return {
      ok: false,
      error: t({
        es: "No pudimos validar la reserva. Probá de nuevo en unos minutos.",
        pt: "Não foi possível validar o agendamento. Tente novamente em alguns minutos.",
      }),
    };
  }
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

  // El horario tiene que ser uno de los que ofrece la disponibilidad (horario de atención,
  // paso de 30 minutos). El choque con otros turnos se vuelve a chequear al insertar.
  const noDisponible: ReservarTurnoResult = {
    ok: false,
    error: t({ es: "Ese horario ya no está disponible. Elegí otro.", pt: "Esse horário não está mais disponível. Escolha outro." }),
  };
  const disponibles = await getDisponibilidad(tenant.id, tenant.zonaHoraria, servicioIds, fecha);
  if (!disponibles.some((s) => s.iso === iso)) return noDisponible;

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

  // Chequeo e inserción atómicos (migración 0023): bajo un lock por tenant, reservar_turnos
  // vuelve a verificar que ningún turno choque con otro activo (dos reservas simultáneas del
  // mismo horario: pasa una sola) y cuenta los turnos futuros del email y del WhatsApp.
  const pedidos: { servicio_id: string; fecha_hora: string; duracion_minutos: number; monto_sena: number | null }[] = [];
  let inicioMs = new Date(iso).getTime();
  for (const [i, servicio] of servicios.entries()) {
    pedidos.push({
      servicio_id: servicio.id,
      fecha_hora: new Date(inicioMs).toISOString(),
      duracion_minutos: servicio.duracion_minutos,
      monto_sena: montos ? montos[i] : null,
    });
    inicioMs += servicio.duracion_minutos * 60000;
  }
  const { data: filasCreadas, error: errorReserva } = await createAdminClient().rpc("reservar_turnos", {
    p_tenant: tenant.id,
    p_turnos: pedidos,
    p_cliente_nombre: clienteNombre,
    p_cliente_email: clienteEmail,
    p_cliente_telefono: clienteWhatsApp,
    p_estado: montos ? "pendiente_pago" : "confirmado",
    p_bloqueado_hasta: montos ? bloqueadoHasta : null,
    p_maximo_por_cliente: MAXIMO_TURNOS_FUTUROS_POR_CLIENTE,
  });
  const resultado = filasCreadas as { turno_id: string; token: string }[] | null;
  if (errorReserva?.code === CODIGO_HORARIO_OCUPADO) return noDisponible;
  if (errorReserva?.code === CODIGO_MAXIMO_POR_CLIENTE) {
    return {
      ok: false,
      error: t({
        es: `Con esta reserva superás el máximo de turnos reservados (${MAXIMO_TURNOS_FUTUROS_POR_CLIENTE}) con este email o este WhatsApp. Si necesitás más, escribinos por WhatsApp.`,
        pt: `Com este agendamento você passa do máximo de agendamentos (${MAXIMO_TURNOS_FUTUROS_POR_CLIENTE}) com este e-mail ou este WhatsApp. Se precisar de mais, fale com a gente pelo WhatsApp.`,
      }),
    };
  }
  if (errorReserva || !resultado || resultado.length !== pedidos.length) {
    return {
      ok: false,
      error: t({ es: "No se pudo crear el turno. Probá de nuevo.", pt: "Não foi possível criar o agendamento. Tente novamente." }),
    };
  }
  const creados = resultado.map((r, i) => ({ id: r.turno_id, token_gestion: r.token, inicioIso: pedidos[i].fecha_hora }));

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
      accessToken: mercadoPago!.accessToken,
      titulo: `${concepto} — ${servicios.map((s) => s.nombre).join(" + ")}`,
      monto: cobro.tipo === "cobro" ? cobro.total : 0,
      moneda: tenant.moneda,
      externalReference: `turno:${creados.map((c) => c.id).join(",")}`,
      clienteEmail,
      baseUrl: urlDelTenant(tenant.slug),
      backUrls: { success: "/turnos/gracias", pending: "/turnos/gracias", failure: "/turnos" },
      // El checkout vence con el bloqueo del turno (un pago tardío igual se revisa en el webhook).
      venceEn: bloqueadoHasta,
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

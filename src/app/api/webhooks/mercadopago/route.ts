import { NextRequest, NextResponse } from "next/server";
import { verificarFirmaWebhook } from "@/lib/mercadopago/signature";
import { obtenerPago, type MpPayment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaCompraCurso } from "@/lib/email/plantillas";
import { calcularExpiracion, precioEfectivo } from "@/lib/cursos/reglas";
import { validarEmailCliente } from "@/lib/turnos/cliente";
import { crearEventoDeTurno, enviarConfirmacionDeTurno, type TurnoConfirmado } from "@/lib/turnos/confirmacion";
import { mismoMonto, sumaEnCentavos } from "@/lib/turnos/reglas";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import type { Idioma } from "@/lib/i18n/textos";

/**
 * Webhook de Mercado Pago. Nunca confía en el payload por sí solo:
 * (1) verifica la firma, (2) reconsulta el pago contra la API de MP.
 * Es idempotente: MP reintenta las notificaciones y puede mandar dos a la vez.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const dataId: string | undefined =
    body?.data?.id ?? request.nextUrl.searchParams.get("data.id") ?? undefined;
  const tipo: string | undefined =
    body?.type ?? request.nextUrl.searchParams.get("type") ?? undefined;

  if (tipo !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && secret !== "xxx") {
    const firmaOk = verificarFirmaWebhook({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!firmaOk) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }
  // Sin MP_WEBHOOK_SECRET configurado, no se puede verificar la firma; se
  // procesa igual (la reconsulta contra la API de MP abajo sigue siendo la
  // fuente de verdad), pero esto DEBE configurarse antes de producción.

  let pago;
  try {
    pago = await obtenerPago(dataId);
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el pago" }, { status: 502 });
  }

  const [refTipo, refId] = (pago.externalReference ?? "").split(":");
  try {
    if (refTipo === "turno" && refId) {
      // Una reserva puede combinar varios servicios consecutivos -> varios turnos.
      await procesarPagoTurnos(refId.split(","), pago);
    } else if (refTipo === "curso" && refId) {
      await procesarPagoCurso(refId, pago);
    }
  } catch (e) {
    // Error de la base: Mercado Pago reintenta la notificación (el procesamiento es idempotente).
    console.error(`Webhook MP: no se pudo procesar el pago ${pago.id}: ${e instanceof Error ? e.message : "error"}`);
    return NextResponse.json({ error: "No se pudo procesar el pago" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type FilaTurnoPagado = {
  id: string;
  tenant_id: string;
  estado: string;
  monto_sena: number | null;
  cliente_nombre: string;
  cliente_email: string;
  fecha_hora: string;
  duracion_minutos: number;
  token_gestion: string;
  servicios: { nombre: string };
  tenants: { slug: string; zona_horaria: string; idioma: string };
};

/** Resultado de confirmar_turnos_pagados (migración 0024). */
type ResultadoConfirmacion = "confirmado" | "ya_procesado" | "ocupado" | "inconsistente";

/**
 * Confirma los turnos de una reserva pagada. Antes compara lo pagado con lo que la reserva
 * cobra (la suma de monto_sena de sus turnos, en centavos): un pago por otro monto no
 * confirma nada (queda en el log para revisarlo a mano).
 * La confirmación es idempotente: confirmar_turnos_pagados hace un update condicional (solo
 * los pendiente_pago) y registra el pago en la misma transacción, bajo el lock del tenant;
 * con el bloqueo de 15 minutos vencido, solo confirma si el horario sigue libre. Solo la
 * notificación que los confirma crea el evento de Calendar y manda el email: un reintento o
 * una notificación simultánea del mismo pago no hacen nada.
 */
async function procesarPagoTurnos(turnoIds: string[], pago: MpPayment) {
  if (pago.status !== "approved") return;
  const ids = [...new Set(turnoIds)];

  // El pago llega sin tenant: se resuelve desde los turnos (consulta de sistema por id).
  const { data, error } = await createAdminClient()
    .from("turnos")
    .select(
      "id, tenant_id, estado, monto_sena, cliente_nombre, cliente_email, fecha_hora, duracion_minutos, token_gestion, servicios(nombre), tenants(slug, zona_horaria, idioma)",
    )
    .in("id", ids);
  if (error) throw new Error(`turnos: ${error.code}`);
  const filas = data as unknown as FilaTurnoPagado[] | null;
  if (!filas || filas.length !== ids.length) {
    console.error(`Webhook MP: el pago ${pago.id} referencia turnos que no se encontraron; no se confirma.`);
    return;
  }
  if (new Set(filas.map((f) => f.tenant_id)).size !== 1) {
    console.error(`Webhook MP: el pago ${pago.id} referencia turnos de más de un cliente; no se confirma.`);
    return;
  }
  const esperado = sumaEnCentavos(filas.map((f) => Number(f.monto_sena ?? 0)));
  if (!mismoMonto(Number(pago.transactionAmount), esperado)) {
    console.error(
      `Webhook MP: el pago ${pago.id} es de ${pago.transactionAmount} y la reserva cobra ${esperado}; no se confirma.`,
    );
    return;
  }

  const { data: resultado, error: errorConfirmacion } = await createAdminClient().rpc("confirmar_turnos_pagados", {
    p_tenant: filas[0].tenant_id,
    p_turnos: ids,
    p_mp_payment_id: pago.id,
  });
  if (errorConfirmacion) {
    if (errorConfirmacion.code === "23505") return; // el pago ya estaba registrado
    throw new Error(`confirmar_turnos_pagados: ${errorConfirmacion.code}`);
  }
  switch (resultado as ResultadoConfirmacion) {
    case "confirmado":
      for (const turno of filas) await avisarTurnoConfirmado(turno);
      return;
    case "ya_procesado":
      return;
    case "ocupado":
      console.error(
        `Webhook MP: el pago ${pago.id} llegó con la reserva vencida y el horario ya lo tomó otro turno; no se confirma. Hay que devolver el pago.`,
      );
      return;
    default:
      console.error(
        `Webhook MP: los turnos del pago ${pago.id} no están todos pendientes de pago (${String(resultado)}); no se confirma.`,
      );
  }
}

/** Después de confirmar: el evento de Calendar (se guarda su id) y el email al cliente. */
async function avisarTurnoConfirmado(turno: FilaTurnoPagado) {
  const confirmado: TurnoConfirmado = {
    slug: turno.tenants.slug,
    idioma: turno.tenants.idioma as Idioma,
    zonaHoraria: turno.tenants.zona_horaria,
    servicio: turno.servicios.nombre,
    clienteNombre: turno.cliente_nombre,
    clienteEmail: turno.cliente_email,
    fechaHoraIso: turno.fecha_hora,
    duracionMinutos: turno.duracion_minutos,
    tokenGestion: turno.token_gestion,
  };

  const eventId = await crearEventoDeTurno(confirmado, "Turno reservado online. Pago aprobado por Mercado Pago.");
  if (eventId) {
    await datosDelTenant(turno.tenant_id).update("turnos", { google_calendar_event_id: eventId }).eq("id", turno.id);
  }

  await enviarConfirmacionDeTurno(confirmado);
}

async function procesarPagoCurso(cursoId: string, pago: MpPayment) {
  if (pago.status !== "approved" || !pago.payerEmail) return;

  // El pago llega sin tenant: se resuelve desde el curso (consulta de sistema por id).
  const { data: curso } = await createAdminClient()
    .from("cursos")
    .select("tenant_id, titulo, dias_acceso, precio, precio_oferta, oferta_activa, oferta_desde, oferta_hasta, tenants(slug)")
    .eq("id", cursoId)
    .maybeSingle();
  if (!curso) return;

  // Lo pagado tiene que ser el precio del curso: el vigente al crear el pago o el de ahora
  // (una oferta puede terminar entre el pago y el webhook).
  const precioEn = (ahoraIso: string) =>
    precioEfectivo({
      precio: Number(curso.precio),
      precioOferta: curso.precio_oferta == null ? null : Number(curso.precio_oferta),
      ofertaActiva: curso.oferta_activa,
      ofertaDesde: curso.oferta_desde,
      ofertaHasta: curso.oferta_hasta,
      ahoraIso,
    });
  const aceptados = [precioEn(new Date().toISOString())];
  if (pago.fechaCreacion) aceptados.push(precioEn(pago.fechaCreacion));
  if (!aceptados.some((precio) => mismoMonto(Number(pago.transactionAmount), precio))) {
    console.error(
      `Webhook MP: el pago ${pago.id} es de ${pago.transactionAmount} y el curso ${cursoId} cuesta ${aceptados.join(" o ")}; no se da acceso.`,
    );
    return;
  }
  const tenantCurso = curso.tenants as unknown as { slug: string };
  const db = datosDelTenant(curso.tenant_id);

  const expiraEn = calcularExpiracion(new Date().toISOString(), curso.dias_acceso);

  // Idempotencia: el acceso es único por pago (índice de la migración 0024). Solo la
  // notificación que lo crea registra el pago y manda el email; un reintento, o una
  // notificación simultánea del mismo pago, choca con el índice (23505) y no hace nada.
  const { data: acceso, error: errorAcceso } = await db
    .insert("accesos_curso", {
      curso_id: cursoId,
      cliente_email: pago.payerEmail,
      expira_en: expiraEn,
      mp_payment_id: pago.id,
    })
    .select("token_acceso")
    .single();
  if (errorAcceso?.code === "23505") return;
  if (errorAcceso || !acceso) throw new Error(`accesos_curso: ${errorAcceso?.code ?? "sin fila"}`);

  const { error: errorPago } = await db.insert("pagos", {
    tipo: "curso",
    referencia_id: cursoId,
    mp_payment_id: pago.id,
    estado: "approved",
    monto: pago.transactionAmount,
  });
  if (errorPago && errorPago.code !== "23505") {
    console.error(`Webhook MP: el acceso del pago ${pago.id} quedó creado pero no se pudo registrar el pago (${errorPago.code}).`);
  }

  // Un solo destinatario: el email del pagador viene de Mercado Pago.
  const destinatario = validarEmailCliente(pago.payerEmail);
  if (isEmailConfigurado() && destinatario) {
    const { subject, html } = plantillaCompraCurso({
      curso: curso.titulo,
      linkAcceso: `${urlDelTenant(tenantCurso.slug)}/cursos/acceso/${acceso.token_acceso}`,
    });
    try {
      await enviarEmail({ to: destinatario, subject, html });
    } catch {
      // El acceso ya quedó creado; el email es best-effort.
    }
  }
}

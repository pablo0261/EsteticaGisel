import { NextRequest, NextResponse } from "next/server";
import { verificarFirmaWebhook } from "@/lib/mercadopago/signature";
import { obtenerPago, type MpPayment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaCompraCurso } from "@/lib/email/plantillas";
import { calcularExpiracion, precioEfectivo } from "@/lib/cursos/reglas";
import { crearEventoDeTurno, enviarConfirmacionDeTurno, type TurnoConfirmado } from "@/lib/turnos/confirmacion";
import { mismoMonto, sumaEnCentavos } from "@/lib/turnos/reglas";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import type { Idioma } from "@/lib/i18n/textos";

/**
 * Webhook de Mercado Pago. Nunca confía en el payload por sí solo:
 * (1) verifica la firma, (2) reconsulta el pago contra la API de MP.
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
  if (refTipo === "turno" && refId) {
    // Una reserva puede combinar varios servicios consecutivos -> varios turnos.
    await procesarPagoTurnos(refId.split(","), pago);
  } else if (refTipo === "curso" && refId) {
    await procesarPagoCurso(refId, pago);
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

/**
 * Confirma los turnos de una reserva pagada. Antes compara lo pagado con lo que la reserva
 * cobra (la suma de monto_sena de sus turnos, en centavos): un pago por otro monto no
 * confirma nada (queda en el log para revisarlo a mano).
 */
async function procesarPagoTurnos(turnoIds: string[], pago: MpPayment) {
  if (pago.status !== "approved") return;

  // El pago llega sin tenant: se resuelve desde los turnos (consulta de sistema por id).
  const { data, error } = await createAdminClient()
    .from("turnos")
    .select(
      "id, tenant_id, estado, monto_sena, cliente_nombre, cliente_email, fecha_hora, duracion_minutos, token_gestion, servicios(nombre), tenants(slug, zona_horaria, idioma)",
    )
    .in("id", turnoIds);
  const filas = data as unknown as FilaTurnoPagado[] | null;
  if (error || !filas || filas.length !== new Set(turnoIds).size) {
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

  for (const turno of filas) {
    await confirmarTurnoPagado(turno, pago.id);
  }
}

async function confirmarTurnoPagado(turno: FilaTurnoPagado, mpPaymentId: string) {
  if (turno.estado !== "pendiente_pago") return; // ya procesado
  const db = datosDelTenant(turno.tenant_id);
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

  await db
    .update("turnos", { estado: "confirmado", google_calendar_event_id: eventId })
    .eq("id", turno.id);

  await db.insert("pagos", {
    tipo: "turno",
    referencia_id: turno.id,
    mp_payment_id: mpPaymentId,
    estado: "approved",
    monto: turno.monto_sena,
  });

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

  // Idempotencia: si este pago ya se procesó (reintento del webhook), no duplicar.
  const { data: pagoExistente } = await db
    .select("pagos", "id")
    .eq("tipo", "curso")
    .eq("mp_payment_id", pago.id)
    .maybeSingle();
  if (pagoExistente) return;

  const expiraEn = calcularExpiracion(new Date().toISOString(), curso.dias_acceso);

  const { data: acceso } = await db
    .insert("accesos_curso", {
      curso_id: cursoId,
      cliente_email: pago.payerEmail,
      expira_en: expiraEn,
      mp_payment_id: pago.id,
    })
    .select("token_acceso")
    .single();

  await db.insert("pagos", {
    tipo: "curso",
    referencia_id: cursoId,
    mp_payment_id: pago.id,
    estado: "approved",
    monto: pago.transactionAmount,
  });

  if (isEmailConfigurado() && acceso) {
    const { subject, html } = plantillaCompraCurso({
      curso: curso.titulo,
      linkAcceso: `${urlDelTenant(tenantCurso.slug)}/cursos/acceso/${acceso.token_acceso}`,
    });
    try {
      await enviarEmail({ to: pago.payerEmail, subject, html });
    } catch {
      // El acceso ya quedó creado; el email es best-effort.
    }
  }
}

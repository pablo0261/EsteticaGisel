import { NextRequest, NextResponse } from "next/server";
import { verificarFirmaWebhook } from "@/lib/mercadopago/signature";
import { obtenerPago, type MpPayment } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGoogleConfigurado, crearEvento } from "@/lib/google-calendar/client";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/resend";
import { plantillaConfirmacionTurno, plantillaCompraCurso } from "@/lib/email/plantillas";
import { calcularExpiracion } from "@/lib/cursos/reglas";

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
    for (const turnoId of refId.split(",")) {
      await procesarPagoTurno(turnoId, pago.status, pago.id);
    }
  } else if (refTipo === "curso" && refId) {
    await procesarPagoCurso(refId, pago);
  }

  return NextResponse.json({ received: true });
}

async function procesarPagoTurno(turnoId: string, estadoPago: string, mpPaymentId: string) {
  if (estadoPago !== "approved") return;

  const db = createAdminClient();
  const { data: turno } = await db
    .from("turnos")
    .select("*, servicios(nombre)")
    .eq("id", turnoId)
    .single();

  if (!turno || turno.estado !== "pendiente_pago") return; // ya procesado o inexistente

  let eventId: string | null = null;
  if (isGoogleConfigurado()) {
    try {
      const fin = new Date(
        new Date(turno.fecha_hora).getTime() + turno.duracion_minutos * 60000,
      ).toISOString();
      eventId = await crearEvento({
        titulo: `${turno.servicios.nombre} — ${turno.cliente_nombre}`,
        descripcion: `Turno reservado online. Seña abonada.`,
        inicioIso: turno.fecha_hora,
        finIso: fin,
        clienteEmail: turno.cliente_email,
      });
    } catch {
      // No bloquea la confirmación del turno si Calendar falla.
    }
  }

  await db
    .from("turnos")
    .update({ estado: "confirmado", google_calendar_event_id: eventId })
    .eq("id", turnoId);

  await db.from("pagos").insert({
    tipo: "turno",
    referencia_id: turnoId,
    mp_payment_id: mpPaymentId,
    estado: "approved",
    monto: turno.monto_sena,
  });

  if (isEmailConfigurado()) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const { subject, html } = plantillaConfirmacionTurno({
      servicio: turno.servicios.nombre,
      fechaHoraTexto,
      linkGestion: `${siteUrl}/turnos/gestion/${turno.token_gestion}`,
    });
    try {
      await enviarEmail({ to: turno.cliente_email, subject, html });
    } catch {
      // El turno ya quedó confirmado; el email es best-effort.
    }
  }
}

async function procesarPagoCurso(cursoId: string, pago: MpPayment) {
  if (pago.status !== "approved" || !pago.payerEmail) return;

  const db = createAdminClient();

  // Idempotencia: si este pago ya se procesó (reintento del webhook), no duplicar.
  const { data: pagoExistente } = await db
    .from("pagos")
    .select("id")
    .eq("tipo", "curso")
    .eq("mp_payment_id", pago.id)
    .maybeSingle();
  if (pagoExistente) return;

  const { data: curso } = await db
    .from("cursos")
    .select("titulo, dias_acceso")
    .eq("id", cursoId)
    .single();
  if (!curso) return;

  const expiraEn = calcularExpiracion(new Date().toISOString(), curso.dias_acceso);

  const { data: acceso } = await db
    .from("accesos_curso")
    .insert({
      curso_id: cursoId,
      cliente_email: pago.payerEmail,
      expira_en: expiraEn,
      mp_payment_id: pago.id,
    })
    .select("token_acceso")
    .single();

  await db.from("pagos").insert({
    tipo: "curso",
    referencia_id: cursoId,
    mp_payment_id: pago.id,
    estado: "approved",
    monto: pago.transactionAmount,
  });

  if (isEmailConfigurado() && acceso) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const { subject, html } = plantillaCompraCurso({
      curso: curso.titulo,
      linkAcceso: `${siteUrl}/cursos/acceso/${acceso.token_acceso}`,
    });
    try {
      await enviarEmail({ to: pago.payerEmail, subject, html });
    } catch {
      // El acceso ya quedó creado; el email es best-effort.
    }
  }
}

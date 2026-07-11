import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/resend";
import { plantillaRecordatorioTurno } from "@/lib/email/plantillas";

function autorizado(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/** Envía el recordatorio a turnos confirmados dentro de la ventana configurada. */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isEmailConfigurado()) {
    return NextResponse.json({ enviados: 0, motivo: "email no configurado" });
  }

  const db = createAdminClient();
  const { data: config } = await db
    .from("configuracion_negocio")
    .select("horas_anticipacion_recordatorio")
    .eq("id", 1)
    .single();
  if (!config) {
    return NextResponse.json({ error: "Sin configuración" }, { status: 500 });
  }

  const ahora = new Date();
  const limite = new Date(
    ahora.getTime() + config.horas_anticipacion_recordatorio * 60 * 60 * 1000,
  );

  const { data: turnos } = await db
    .from("turnos")
    .select("id, cliente_email, fecha_hora, token_gestion, servicios(nombre)")
    .eq("estado", "confirmado")
    .eq("recordatorio_enviado", false)
    .gte("fecha_hora", ahora.toISOString())
    .lte("fecha_hora", limite.toISOString());

  let enviados = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  for (const turno of turnos ?? []) {
    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const { subject, html } = plantillaRecordatorioTurno({
      servicio: (turno.servicios as unknown as { nombre: string }).nombre,
      fechaHoraTexto,
      linkGestion: `${siteUrl}/turnos/gestion/${turno.token_gestion}`,
    });
    try {
      await enviarEmail({ to: turno.cliente_email, subject, html });
      await db.from("turnos").update({ recordatorio_enviado: true }).eq("id", turno.id);
      enviados++;
    } catch {
      // Se reintenta en la próxima corrida del cron.
    }
  }

  return NextResponse.json({ enviados });
}

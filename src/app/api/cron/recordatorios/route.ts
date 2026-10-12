import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAutorizado } from "@/lib/cron/autorizacion";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaRecordatorioTurno } from "@/lib/email/plantillas";
import { recordatorioQueCorresponde, type TipoRecordatorio } from "@/lib/turnos/recordatorios";
import { datosDelTenant } from "@/lib/tenant/datos";
import { urlDelTenant } from "@/lib/tenant/urls";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";

function autorizado(request: NextRequest): boolean {
  return cronAutorizado(request.headers.get("authorization"), process.env.CRON_SECRET);
}

const FALTA_TEXTO: Record<TipoRecordatorio, string> = {
  "48h": "2 días",
  "24h": "1 día",
  "2h": "2 horas",
};

/** Envía los recordatorios de 48h, 24h y 2h a turnos confirmados. Corre cada 10 min. */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isEmailConfigurado()) {
    return NextResponse.json({ enviados: 0, motivo: "email no configurado" });
  }

  const db = createAdminClient();
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

  const { data: turnos } = await db
    .from("turnos")
    .select(
      "id, tenant_id, cliente_email, fecha_hora, creado_en, token_gestion, servicios(nombre), recordatorios_enviados(tipo, canal), tenants(slug, zona_horaria, idioma)",
    )
    .eq("estado", "confirmado")
    .gte("fecha_hora", ahora.toISOString())
    .lte("fecha_hora", limite.toISOString());

  let enviados = 0;

  for (const turno of turnos ?? []) {
    const tipo = recordatorioQueCorresponde({
      fechaHoraIso: turno.fecha_hora,
      creadoEnIso: turno.creado_en,
      ahoraIso: ahora.toISOString(),
      enviados: turno.recordatorios_enviados
        .filter((r) => r.canal === "email")
        .map((r) => r.tipo as TipoRecordatorio),
    });
    if (!tipo) continue;
    const datos = datosDelTenant(turno.tenant_id);
    const tenantTurno = turno.tenants as unknown as {
      slug: string;
      zona_horaria: string;
      idioma: Idioma;
    };

    // Se registra antes de enviar: la clave única evita duplicados si dos corridas se pisan.
    const { error: yaTomado } = await datos
      .insert("recordatorios_enviados", { turno_id: turno.id, tipo, canal: "email" });
    if (yaTomado) continue;

    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenantTurno.idioma], {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: tenantTurno.zona_horaria,
    });
    const { subject, html } = plantillaRecordatorioTurno({
      servicio: (turno.servicios as unknown as { nombre: string }).nombre,
      fechaHoraTexto,
      faltaTexto: FALTA_TEXTO[tipo],
      linkGestion: `${urlDelTenant(tenantTurno.slug)}/turnos/gestion/${turno.token_gestion}`,
    });
    try {
      await enviarEmail({ to: turno.cliente_email, subject, html });
      enviados++;
    } catch {
      // Se libera el registro para reintentar en la próxima corrida del cron.
      await datos
        .delete("recordatorios_enviados")
        .match({ turno_id: turno.id, tipo, canal: "email" });
    }
  }

  return NextResponse.json({ enviados });
}

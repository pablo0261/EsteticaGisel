import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAutorizado } from "@/lib/cron/autorizacion";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { logoAbsoluto, type MarcaEmail } from "@/lib/email/layout-marca";
import { plantillaRecordatorioTurno, type FaltaRecordatorio } from "@/lib/email/plantillas";
import { recordatorioQueCorresponde, type TipoRecordatorio } from "@/lib/turnos/recordatorios";
import { datosDelTenant } from "@/lib/tenant/datos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { urlDelTenant } from "@/lib/tenant/urls";
import { validarEmailCliente } from "@/lib/turnos/cliente";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";

function autorizado(request: NextRequest): boolean {
  return cronAutorizado(request.headers.get("authorization"), process.env.CRON_SECRET);
}

type MarcaJoin = {
  color_primario: string;
  color_secundario: string;
  color_fondo: string;
  color_texto: string;
  logo_url: string | null;
};

type TenantJoin = {
  slug: string;
  nombre: string;
  zona_horaria: string;
  idioma: string;
  tenant_marca: MarcaJoin | MarcaJoin[] | null;
};

function marcaDelTenant(tenant: TenantJoin): MarcaEmail | null {
  const fila = Array.isArray(tenant.tenant_marca) ? tenant.tenant_marca[0] : tenant.tenant_marca;
  if (!fila) return null;
  const idioma: Idioma = tenant.idioma === "pt" ? "pt" : "es";
  return {
    nombre: tenant.nombre,
    idioma,
    colores: {
      colorPrimario: fila.color_primario,
      colorSecundario: fila.color_secundario,
      colorFondo: fila.color_fondo,
      colorTexto: fila.color_texto,
    },
    logoUrl: logoAbsoluto(fila.logo_url, urlDelTenant(tenant.slug)),
  };
}

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
      "id, tenant_id, cliente_email, fecha_hora, creado_en, token_gestion, servicios(nombre), recordatorios_enviados(tipo, canal), tenants(slug, nombre, zona_horaria, idioma, tenant_marca(color_primario, color_secundario, color_fondo, color_texto, logo_url))",
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
    const tenantTurno = turno.tenants as unknown as TenantJoin | null;
    // El Gmail del .env es de un solo tenant: los demás no reciben un email con la cuenta de otro.
    if (!tenantTurno?.slug || !usaCredencialesGlobales(tenantTurno.slug)) continue;
    const marca = marcaDelTenant(tenantTurno);
    if (!marca) continue;
    const destinatario = validarEmailCliente(turno.cliente_email);
    if (!destinatario) continue;

    // Se registra antes de enviar: la clave única evita duplicados si dos corridas se pisan.
    const { error: yaTomado } = await datos
      .insert("recordatorios_enviados", { turno_id: turno.id, tipo, canal: "email" });
    if (yaTomado) continue;

    const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(LOCALES[marca.idioma], {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: tenantTurno.zona_horaria,
    });
    const { subject, html } = plantillaRecordatorioTurno({
      marca,
      servicio: (turno.servicios as unknown as { nombre: string }).nombre,
      fechaHoraTexto,
      falta: tipo as FaltaRecordatorio,
      linkGestion: `${urlDelTenant(tenantTurno.slug)}/turnos/gestion/${turno.token_gestion}`,
    });
    try {
      await enviarEmail({ to: destinatario, subject, html });
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

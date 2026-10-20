import "server-only";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaConfirmacionTurno } from "@/lib/email/plantillas";
import { crearEvento } from "@/lib/google-calendar/client";
import { cuentaGoogle } from "@/lib/integraciones/cuenta";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { urlDelTenant } from "@/lib/tenant/urls";
import { validarEmailCliente } from "./cliente";

/**
 * Lo que pasa cuando un turno queda confirmado (pago aprobado por Mercado Pago o reserva sin
 * pago anticipado): el evento de Google Calendar y el email de confirmación.
 * Calendar usa las credenciales del cliente (panel, o el .env del tenant global).
 * El email sigue saliendo por el Gmail del .env, solo para ese tenant, hasta que cada
 * cliente tenga el suyo. Los dos son best effort: un fallo no deshace la confirmación.
 */
export type TurnoConfirmado = {
  slug: string;
  idioma: Idioma;
  zonaHoraria: string;
  servicio: string;
  clienteNombre: string;
  clienteEmail: string;
  fechaHoraIso: string;
  duracionMinutos: number;
  tokenGestion: string;
};

/** Id del evento creado, o null si no corresponde o falló. */
export async function crearEventoDeTurno(turno: TurnoConfirmado, descripcion: string): Promise<string | null> {
  const tenant = await getTenantPorSlug(turno.slug);
  const cuenta = tenant ? await cuentaGoogle(tenant.id, tenant.slug) : null;
  if (!cuenta) return null;
  try {
    const fin = new Date(new Date(turno.fechaHoraIso).getTime() + turno.duracionMinutos * 60000).toISOString();
    return await crearEvento({
      cuenta,
      titulo: `${turno.servicio} — ${turno.clienteNombre}`,
      descripcion,
      inicioIso: turno.fechaHoraIso,
      finIso: fin,
      clienteEmail: turno.clienteEmail,
    });
  } catch {
    return null;
  }
}

export async function enviarConfirmacionDeTurno(turno: TurnoConfirmado): Promise<void> {
  if (!isEmailConfigurado() || !usaCredencialesGlobales(turno.slug)) return;
  // Un solo destinatario: la reserva ya lo valida, pero un turno anterior a esa validación
  // (o cargado por otra vía) no debe convertirse en una lista de destinatarios.
  const destinatario = validarEmailCliente(turno.clienteEmail);
  if (!destinatario) return;
  const fechaHoraTexto = new Date(turno.fechaHoraIso).toLocaleString(LOCALES[turno.idioma], {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: turno.zonaHoraria,
  });
  const { subject, html } = plantillaConfirmacionTurno({
    servicio: turno.servicio,
    fechaHoraTexto,
    linkGestion: `${urlDelTenant(turno.slug)}/turnos/gestion/${turno.tokenGestion}`,
  });
  try {
    await enviarEmail({ to: destinatario, subject, html });
  } catch {
    // El turno ya quedó confirmado; el email es best effort.
  }
}

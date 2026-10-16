import "server-only";
import { isEmailConfigurado, enviarEmail } from "@/lib/email/gmail";
import { plantillaConfirmacionTurno } from "@/lib/email/plantillas";
import { isGoogleConfigurado, crearEvento } from "@/lib/google-calendar/client";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { urlDelTenant } from "@/lib/tenant/urls";
import { validarEmailCliente } from "./cliente";

/**
 * Lo que pasa cuando un turno queda confirmado (pago aprobado por Mercado Pago o reserva sin
 * pago anticipado): el evento de Google Calendar y el email de confirmación. Hasta la etapa D
 * los dos usan las credenciales globales del .env (el Calendar y el Gmail de un solo cliente,
 * y la plantilla del email lleva su logo), así que solo corren para ese tenant
 * (usaCredencialesGlobales). Son best effort: un fallo no deshace la confirmación.
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
  if (!isGoogleConfigurado() || !usaCredencialesGlobales(turno.slug)) return null;
  try {
    const fin = new Date(new Date(turno.fechaHoraIso).getTime() + turno.duracionMinutos * 60000).toISOString();
    return await crearEvento({
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

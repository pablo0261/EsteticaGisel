type EmailPlantilla = { subject: string; html: string };

const COLOR = {
  mauve: "#c0899a",
  mauveDark: "#a66f82",
  sage: "#4e5340",
  cream: "#f6f1ea",
  ink: "#1a1a1a",
  inkSoft: "#55514e",
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "Helvetica, Arial, sans-serif";

function logoUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/brand/horizontal-rosa.png`;
}

function boton(texto: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 4px;">
      <tr>
        <td style="background-color:${COLOR.mauve}; border-radius: 999px;">
          <a href="${url}" style="display:inline-block; padding: 12px 28px; font-family: ${FONT_SANS}; font-size: 14px; font-weight: 600; color: ${COLOR.cream}; text-decoration: none;">
            ${texto}
          </a>
        </td>
      </tr>
    </table>`;
}

function layout(titulo: string, cuerpoHtml: string): string {
  return `<!doctype html>
<html lang="es-AR">
  <body style="margin:0; padding:0; background-color:${COLOR.cream};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.cream};">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="100%" style="max-width: 520px;" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom: 28px;">
                <img src="${logoUrl()}" alt="Gisel Bigurrarena" width="200" style="display:block; max-width: 200px;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; border-radius: 16px; padding: 36px 32px; border-top: 4px solid ${COLOR.mauve};">
                <h1 style="margin:0 0 16px; font-family: ${FONT_SERIF}; font-size: 24px; font-weight: 500; color:${COLOR.mauveDark};">
                  ${titulo}
                </h1>
                <div style="font-family: ${FONT_SANS}; font-size: 15px; line-height: 1.7; color:${COLOR.ink};">
                  ${cuerpoHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 28px; font-family: ${FONT_SANS}; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color:${COLOR.sage};">
                Gisel Bigurrarena · Estética y Salud
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function plantillaConfirmacionTurno(opts: {
  servicio: string;
  fechaHoraTexto: string;
  linkGestion: string;
}): EmailPlantilla {
  return {
    subject: `Turno confirmado — ${opts.servicio}`,
    html: layout(
      "¡Tu turno está confirmado!",
      `<p style="margin:0 0 4px;">Servicio</p>
       <p style="margin:0 0 16px; font-size: 17px; color:${COLOR.ink};"><strong>${opts.servicio}</strong></p>
       <p style="margin:0 0 4px; color:${COLOR.inkSoft};">Fecha</p>
       <p style="margin:0 0 20px; font-size: 17px;"><strong>${opts.fechaHoraTexto}</strong></p>
       <p style="margin:0 0 4px; color:${COLOR.inkSoft};">¿Necesitás cancelar o reprogramar?</p>
       ${boton("Gestionar mi turno", opts.linkGestion)}`,
    ),
  };
}

export function plantillaRecordatorioTurno(opts: {
  servicio: string;
  fechaHoraTexto: string;
  faltaTexto: string;
  linkGestion: string;
}): EmailPlantilla {
  return {
    subject: `Recordatorio: faltan ${opts.faltaTexto} para tu turno — ${opts.servicio}`,
    html: layout(
      `Faltan ${opts.faltaTexto} para tu turno`,
      `<p style="margin:0 0 16px;">Te esperamos para tu turno de <strong>${opts.servicio}</strong>.</p>
       <p style="margin:0 0 4px; color:${COLOR.inkSoft};">Fecha</p>
       <p style="margin:0 0 20px; font-size: 17px;"><strong>${opts.fechaHoraTexto}</strong></p>
       <p style="margin:0 0 4px; color:${COLOR.inkSoft};">¿Necesitás cancelar o reprogramar?</p>
       ${boton("Gestionar mi turno", opts.linkGestion)}`,
    ),
  };
}

export function plantillaCancelacionTurno(opts: {
  servicio: string;
  fechaHoraTexto: string;
}): EmailPlantilla {
  return {
    subject: `Turno cancelado — ${opts.servicio}`,
    html: layout(
      "Tu turno fue cancelado",
      `<p>Se canceló el turno de <strong>${opts.servicio}</strong> del ${opts.fechaHoraTexto}.</p>
       <p style="color:${COLOR.inkSoft};">La seña abonada no es reembolsable. Cuando quieras, podés reservar un nuevo turno.</p>`,
    ),
  };
}

export function plantillaCompraCurso(opts: {
  curso: string;
  linkAcceso: string;
}): EmailPlantilla {
  return {
    subject: `Ya tenés acceso a "${opts.curso}"`,
    html: layout(
      "¡Gracias por tu compra!",
      `<p style="margin:0 0 20px;">Ya podés acceder a <strong>${opts.curso}</strong>.</p>
       ${boton("Ver mi curso", opts.linkAcceso)}`,
    ),
  };
}

type EmailPlantilla = { subject: string; html: string };

const layout = (titulo: string, cuerpo: string) => `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 22px; color: #a66f82;">${titulo}</h1>
  ${cuerpo}
  <p style="margin-top: 32px; font-size: 12px; color: #55514e;">
    Gisel Bigurrarena · Estética y Salud
  </p>
</div>
`;

export function plantillaConfirmacionTurno(opts: {
  servicio: string;
  fechaHoraTexto: string;
  linkGestion: string;
}): EmailPlantilla {
  return {
    subject: `Turno confirmado — ${opts.servicio}`,
    html: layout(
      "¡Tu turno está confirmado!",
      `<p>Servicio: <strong>${opts.servicio}</strong></p>
       <p>Fecha: <strong>${opts.fechaHoraTexto}</strong></p>
       <p>Si necesitás cancelar o reprogramar, hacelo desde este link:</p>
       <p><a href="${opts.linkGestion}">${opts.linkGestion}</a></p>`,
    ),
  };
}

export function plantillaRecordatorioTurno(opts: {
  servicio: string;
  fechaHoraTexto: string;
  linkGestion: string;
}): EmailPlantilla {
  return {
    subject: `Recordatorio de tu turno — ${opts.servicio}`,
    html: layout(
      "Recordatorio de tu turno",
      `<p>Te esperamos para tu turno de <strong>${opts.servicio}</strong>.</p>
       <p>Fecha: <strong>${opts.fechaHoraTexto}</strong></p>
       <p>¿Necesitás cancelar o reprogramar? <a href="${opts.linkGestion}">Hacelo acá</a>.</p>`,
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
       <p>La seña abonada no es reembolsable. Cuando quieras, podés reservar un nuevo turno.</p>`,
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
      `<p>Ya podés acceder a <strong>${opts.curso}</strong>.</p>
       <p><a href="${opts.linkAcceso}">${opts.linkAcceso}</a></p>`,
    ),
  };
}

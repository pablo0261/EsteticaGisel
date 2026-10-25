import { traductor } from "@/lib/i18n/textos";
import { botonMarca, coloresSeguros, escaparHtml, layoutMarca, type MarcaEmail } from "./layout-marca";

type EmailPlantilla = { subject: string; html: string };

/** El asunto no es HTML, pero un salto de línea inyectaría otra cabecera. */
function asunto(texto: string): string {
  return texto.replace(/[\r\n]+/g, " ");
}

function plantilla(marca: MarcaEmail, titulo: string, cuerpoHtml: string): string {
  return layoutMarca(marca, { titulo, cuerpoHtml });
}

/**
 * Emails de turnos y cursos con la marca del tenant (nombre, idioma, colores y logo).
 * No hay una marca fija de ningún salón.
 */
export function plantillaConfirmacionTurno(opts: {
  marca: MarcaEmail;
  servicio: string;
  fechaHoraTexto: string;
  linkGestion: string;
}): EmailPlantilla {
  const t = traductor(opts.marca.idioma);
  const { colorTexto } = coloresSeguros(opts.marca.colores);
  const servicio = escaparHtml(opts.servicio);
  const fecha = escaparHtml(opts.fechaHoraTexto);
  return {
    subject: asunto(t({ es: `Turno confirmado — ${opts.servicio}`, pt: `Horário confirmado — ${opts.servicio}` })),
    html: plantilla(
      opts.marca,
      t({ es: "¡Tu turno está confirmado!", pt: "Seu horário está confirmado!" }),
      `<p style="margin:0 0 4px;">${t({ es: "Servicio", pt: "Serviço" })}</p>
       <p style="margin:0 0 16px; font-size:17px; color:${colorTexto};"><strong>${servicio}</strong></p>
       <p style="margin:0 0 4px;">${t({ es: "Fecha", pt: "Data" })}</p>
       <p style="margin:0 0 20px; font-size:17px;"><strong>${fecha}</strong></p>
       <p style="margin:0 0 4px;">${t({ es: "¿Necesitás cancelar o reprogramar?", pt: "Precisa cancelar ou reagendar?" })}</p>
       ${botonMarca(opts.marca, t({ es: "Gestionar mi turno", pt: "Gerenciar meu horário" }), opts.linkGestion)}`,
    ),
  };
}

const FALTA = {
  "48h": { es: "2 días", pt: "2 dias" },
  "24h": { es: "1 día", pt: "1 dia" },
  "2h": { es: "2 horas", pt: "2 horas" },
} as const;

export type FaltaRecordatorio = keyof typeof FALTA;

export function plantillaRecordatorioTurno(opts: {
  marca: MarcaEmail;
  servicio: string;
  fechaHoraTexto: string;
  falta: FaltaRecordatorio;
  linkGestion: string;
}): EmailPlantilla {
  const t = traductor(opts.marca.idioma);
  const faltaTexto = t(FALTA[opts.falta]);
  const servicio = escaparHtml(opts.servicio);
  const fecha = escaparHtml(opts.fechaHoraTexto);
  return {
    subject: asunto(
      t({
        es: `Recordatorio: faltan ${faltaTexto} para tu turno — ${opts.servicio}`,
        pt: `Lembrete: faltam ${faltaTexto} para o seu horário — ${opts.servicio}`,
      }),
    ),
    html: plantilla(
      opts.marca,
      t({ es: `Faltan ${faltaTexto} para tu turno`, pt: `Faltam ${faltaTexto} para o seu horário` }),
      `<p style="margin:0 0 16px;">${t({
        es: `Te esperamos para tu turno de <strong>${servicio}</strong>.`,
        pt: `Esperamos você para o atendimento de <strong>${servicio}</strong>.`,
      })}</p>
       <p style="margin:0 0 4px;">${t({ es: "Fecha", pt: "Data" })}</p>
       <p style="margin:0 0 20px; font-size:17px;"><strong>${fecha}</strong></p>
       <p style="margin:0 0 4px;">${t({ es: "¿Necesitás cancelar o reprogramar?", pt: "Precisa cancelar ou reagendar?" })}</p>
       ${botonMarca(opts.marca, t({ es: "Gestionar mi turno", pt: "Gerenciar meu horário" }), opts.linkGestion)}`,
    ),
  };
}

export function plantillaCancelacionTurno(opts: {
  marca: MarcaEmail;
  servicio: string;
  fechaHoraTexto: string;
}): EmailPlantilla {
  const t = traductor(opts.marca.idioma);
  const { colorSecundario } = coloresSeguros(opts.marca.colores);
  return {
    subject: asunto(t({ es: `Turno cancelado — ${opts.servicio}`, pt: `Horário cancelado — ${opts.servicio}` })),
    html: plantilla(
      opts.marca,
      t({ es: "Tu turno fue cancelado", pt: "Seu horário foi cancelado" }),
      `<p>${t({
        es: `Se canceló el turno de <strong>${escaparHtml(opts.servicio)}</strong> del ${escaparHtml(opts.fechaHoraTexto)}.`,
        pt: `O atendimento de <strong>${escaparHtml(opts.servicio)}</strong> de ${escaparHtml(opts.fechaHoraTexto)} foi cancelado.`,
      })}</p>
       <p style="color:${colorSecundario};">${t({
         es: "La seña abonada no es reembolsable. Cuando quieras, podés reservar un nuevo turno.",
         pt: "O sinal pago não é reembolsável. Quando quiser, você pode agendar um novo horário.",
       })}</p>`,
    ),
  };
}

export function plantillaCompraCurso(opts: {
  marca: MarcaEmail;
  curso: string;
  linkAcceso: string;
}): EmailPlantilla {
  const t = traductor(opts.marca.idioma);
  return {
    subject: asunto(t({ es: `Ya tenés acceso a "${opts.curso}"`, pt: `Você já tem acesso a "${opts.curso}"` })),
    html: plantilla(
      opts.marca,
      t({ es: "¡Gracias por tu compra!", pt: "Obrigado pela sua compra!" }),
      `<p style="margin:0 0 20px;">${t({
        es: `Ya podés acceder a <strong>${escaparHtml(opts.curso)}</strong>.`,
        pt: `Você já pode acessar <strong>${escaparHtml(opts.curso)}</strong>.`,
      })}</p>
       ${botonMarca(opts.marca, t({ es: "Ver mi curso", pt: "Ver meu curso" }), opts.linkAcceso)}`,
    ),
  };
}

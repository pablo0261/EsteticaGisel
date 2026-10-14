import type { Textos } from "@/lib/i18n/textos";
import type { Modulos } from "@/lib/tenant/tipos";

/**
 * Secciones del panel del cliente y el módulo que habilita cada una (null = siempre).
 * Puro: lo usan el menú del layout, el inicio del panel y los chequeos del servidor
 * (tenantDeSeccion y tenantDeAccion), así el menú y los permisos no se desincronizan.
 */
export type SeccionPanel =
  | "turnos"
  | "servicios"
  | "configuracion"
  | "textos"
  | "cursos"
  | "testimonios"
  | "galeria"
  | "preguntas";

export type DefinicionSeccion = {
  seccion: SeccionPanel;
  ruta: string;
  modulo: keyof Modulos | null;
  titulo: Textos;
  descripcion: Textos;
};

export const SECCIONES_PANEL: readonly DefinicionSeccion[] = [
  {
    seccion: "turnos",
    ruta: "/admin/turnos",
    modulo: "turnos",
    titulo: { es: "Turnos", pt: "Agendamentos" },
    descripcion: { es: "Tu agenda: completar o cancelar turnos.", pt: "Sua agenda: concluir ou cancelar atendimentos." },
  },
  {
    seccion: "servicios",
    ruta: "/admin/servicios",
    modulo: null,
    titulo: { es: "Servicios", pt: "Serviços" },
    descripcion: { es: "Precios, duración y visibilidad.", pt: "Preços, duração e visibilidade." },
  },
  {
    seccion: "configuracion",
    ruta: "/admin/configuracion",
    modulo: null,
    titulo: { es: "Horarios y reglas", pt: "Horários e regras" },
    descripcion: {
      es: "Horario de atención, cancelaciones y forma de pago.",
      pt: "Horário de atendimento, cancelamentos e forma de pagamento.",
    },
  },
  {
    seccion: "textos",
    ruta: "/admin/textos",
    modulo: null,
    titulo: { es: "Textos", pt: "Textos" },
    descripcion: { es: "Textos de inicio y “sobre mí”.", pt: "Textos da página inicial e “sobre mim”." },
  },
  {
    seccion: "cursos",
    ruta: "/admin/cursos",
    modulo: "cursos",
    titulo: { es: "Cursos", pt: "Cursos" },
    descripcion: { es: "Cursos online, videos y compras.", pt: "Cursos online, vídeos e compras." },
  },
  {
    seccion: "testimonios",
    ruta: "/admin/testimonios",
    modulo: "testimonios",
    titulo: { es: "Testimonios", pt: "Depoimentos" },
    descripcion: { es: "Lo que dicen tus clientes.", pt: "O que seus clientes dizem." },
  },
  {
    seccion: "galeria",
    ruta: "/admin/galeria",
    modulo: "galeria",
    titulo: { es: "Galería", pt: "Galeria" },
    descripcion: { es: "Fotos de tus trabajos.", pt: "Fotos dos seus trabalhos." },
  },
  {
    seccion: "preguntas",
    ruta: "/admin/preguntas",
    modulo: "faq",
    titulo: { es: "Preguntas frecuentes", pt: "Perguntas frequentes" },
    descripcion: { es: "Respuestas a las consultas de siempre.", pt: "Respostas para as dúvidas mais comuns." },
  },
];

function habilitada(def: DefinicionSeccion, modulos: Modulos): boolean {
  return def.modulo === null || modulos[def.modulo] === true;
}

export function seccionHabilitada(modulos: Modulos, seccion: SeccionPanel): boolean {
  const def = SECCIONES_PANEL.find((s) => s.seccion === seccion);
  return def !== undefined && habilitada(def, modulos);
}

/** Secciones visibles con estos módulos, en el orden del menú. */
export function seccionesDelPanel(modulos: Modulos): DefinicionSeccion[] {
  return SECCIONES_PANEL.filter((s) => habilitada(s, modulos));
}

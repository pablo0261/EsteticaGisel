import type { Modulos } from "@/lib/tenant/tipos";

/** Módulos de un cliente: clave de Modulos, columna de tenants y etiqueta del panel. */
export type ColumnaModulo =
  | "modulo_turnos"
  | "modulo_cursos"
  | "modulo_sobre_mi"
  | "modulo_testimonios"
  | "modulo_galeria"
  | "modulo_faq"
  | "modulo_whatsapp";

export const MODULOS: readonly { clave: keyof Modulos; columna: ColumnaModulo; etiqueta: string }[] = [
  { clave: "turnos", columna: "modulo_turnos", etiqueta: "Turnos" },
  { clave: "cursos", columna: "modulo_cursos", etiqueta: "Cursos" },
  { clave: "sobreMi", columna: "modulo_sobre_mi", etiqueta: "Sobre mí" },
  { clave: "testimonios", columna: "modulo_testimonios", etiqueta: "Testimonios" },
  { clave: "galeria", columna: "modulo_galeria", etiqueta: "Galería" },
  { clave: "faq", columna: "modulo_faq", etiqueta: "Preguntas frecuentes" },
  { clave: "whatsapp", columna: "modulo_whatsapp", etiqueta: "Botón de WhatsApp" },
];

/** Los mismos valores por defecto que la tabla tenants. */
export const MODULOS_POR_DEFECTO: Modulos = {
  turnos: true,
  cursos: false,
  sobreMi: true,
  testimonios: false,
  galeria: false,
  faq: false,
  whatsapp: false,
};

/** Casillas del formulario: name = columna, "on" si está tildada. */
export function parsearModulos(fd: FormData): Modulos {
  const tildado = (columna: ColumnaModulo) => fd.get(columna) === "on";
  return {
    turnos: tildado("modulo_turnos"),
    cursos: tildado("modulo_cursos"),
    sobreMi: tildado("modulo_sobre_mi"),
    testimonios: tildado("modulo_testimonios"),
    galeria: tildado("modulo_galeria"),
    faq: tildado("modulo_faq"),
    whatsapp: tildado("modulo_whatsapp"),
  };
}

export function columnasModulos(m: Modulos): Record<ColumnaModulo, boolean> {
  return {
    modulo_turnos: m.turnos,
    modulo_cursos: m.cursos,
    modulo_sobre_mi: m.sobreMi,
    modulo_testimonios: m.testimonios,
    modulo_galeria: m.galeria,
    modulo_faq: m.faq,
    modulo_whatsapp: m.whatsapp,
  };
}

export function modulosDeFila(fila: Record<ColumnaModulo, boolean>): Modulos {
  return {
    turnos: fila.modulo_turnos,
    cursos: fila.modulo_cursos,
    sobreMi: fila.modulo_sobre_mi,
    testimonios: fila.modulo_testimonios,
    galeria: fila.modulo_galeria,
    faq: fila.modulo_faq,
    whatsapp: fila.modulo_whatsapp,
  };
}

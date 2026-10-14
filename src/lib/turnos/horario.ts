import type { Idioma } from "@/lib/i18n/textos";
import type { DiaSemana } from "./fechas";

export const DIAS_SEMANA = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

type DiaFormulario = { key: string; cerrado: boolean; desde: string; hasta: string };

/** Construye el JSON de horario_atencion a partir de los datos del formulario de admin. */
export function construirHorarioAtencion(
  dias: DiaFormulario[],
): Record<string, [string, string]> {
  const horario: Record<string, [string, string]> = {};
  for (const d of dias) {
    if (!d.cerrado && d.desde && d.hasta) {
      horario[d.key] = [d.desde, d.hasta];
    }
  }
  return horario;
}

type NombresHorario = {
  /** Nombre del día en un rango ("Lunes a viernes"). */
  enRango: Record<DiaSemana, string>;
  /** Nombre del día cuando va solo ("Sábados"). */
  solo: Record<DiaSemana, string>;
  /** Conector de dos días seguidos. */
  y: string;
  /** Conector de tres o más días seguidos. */
  a: string;
  horas: (desde: string, hasta: string) => string;
};

const NOMBRES: Record<Idioma, NombresHorario> = {
  es: {
    enRango: {
      lun: "Lunes",
      mar: "Martes",
      mie: "Miércoles",
      jue: "Jueves",
      vie: "Viernes",
      sab: "Sábado",
      dom: "Domingo",
    },
    solo: {
      lun: "Lunes",
      mar: "Martes",
      mie: "Miércoles",
      jue: "Jueves",
      vie: "Viernes",
      sab: "Sábados",
      dom: "Domingos",
    },
    y: "y",
    a: "a",
    horas: (desde, hasta) => `${desde} a ${hasta} hs`,
  },
  pt: {
    enRango: {
      lun: "Segunda",
      mar: "Terça",
      mie: "Quarta",
      jue: "Quinta",
      vie: "Sexta",
      sab: "Sábado",
      dom: "Domingo",
    },
    solo: {
      lun: "Segundas",
      mar: "Terças",
      mie: "Quartas",
      jue: "Quintas",
      vie: "Sextas",
      sab: "Sábados",
      dom: "Domingos",
    },
    y: "e",
    a: "a",
    horas: (desde, hasta) => `${desde} às ${hasta}`,
  },
};

/**
 * Agrupa los días consecutivos con el mismo horario, en el idioma del sitio:
 * "Lunes a viernes · 14:00 a 19:00 hs" / "Segunda a sexta · 14:00 às 19:00".
 */
export function resumirHorario(
  horario: Record<string, [string, string]>,
  idioma: Idioma,
): { dias: string; horas: string }[] {
  const grupos: { keys: DiaSemana[]; rango: [string, string] }[] = [];
  let anteriorAbierto = false;

  for (const { key } of DIAS_SEMANA) {
    const rango = horario[key];
    if (!rango) {
      anteriorAbierto = false;
      continue;
    }
    const ultimo = grupos[grupos.length - 1];
    if (anteriorAbierto && ultimo && ultimo.rango[0] === rango[0] && ultimo.rango[1] === rango[1]) {
      ultimo.keys.push(key);
    } else {
      grupos.push({ keys: [key], rango });
    }
    anteriorAbierto = true;
  }

  const n = NOMBRES[idioma];
  return grupos.map(({ keys, rango }) => {
    const primero = keys[0];
    const ultimo = keys[keys.length - 1];
    const dias =
      keys.length === 1
        ? n.solo[primero]
        : `${n.enRango[primero]} ${keys.length === 2 ? n.y : n.a} ${n.enRango[ultimo].toLowerCase()}`;
    return { dias, horas: n.horas(rango[0], rango[1]) };
  });
}

/** Nombre del día para el panel ("Lunes", "Segunda"). */
export function nombreDia(dia: DiaSemana, idioma: Idioma): string {
  return NOMBRES[idioma].enRango[dia];
}

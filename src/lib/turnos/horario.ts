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

const PLURAL: Record<string, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábados",
  dom: "Domingos",
};

/** Agrupa los días consecutivos con el mismo horario: "Lunes a viernes · 14:00 a 19:00 hs". */
export function resumirHorario(
  horario: Record<string, [string, string]>,
): { dias: string; horas: string }[] {
  const grupos: { keys: string[]; rango: [string, string] }[] = [];
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

  const label = (key: string) => DIAS_SEMANA.find((d) => d.key === key)!.label;
  return grupos.map(({ keys, rango }) => {
    const primero = keys[0];
    const ultimo = keys[keys.length - 1];
    const dias =
      keys.length === 1
        ? PLURAL[primero]
        : `${label(primero)} ${keys.length === 2 ? "y" : "a"} ${label(ultimo).toLowerCase()}`;
    return { dias, horas: `${rango[0]} a ${rango[1]} hs` };
  });
}

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

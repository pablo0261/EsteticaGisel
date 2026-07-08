/**
 * Helpers de fecha/hora para Argentina.
 * Argentina no aplica horario de verano desde 2009 → offset fijo -03:00.
 */
const OFFSET_AR = "-03:00";
const OFFSET_MIN = 180; // 3 horas
const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

/** Arma un ISO con offset de Argentina a partir de una fecha y minutos del día. */
export function isoFechaHoraAR(fecha: string, minutosDelDia: number): string {
  const hh = String(Math.floor(minutosDelDia / 60)).padStart(2, "0");
  const mm = String(minutosDelDia % 60).padStart(2, "0");
  return `${fecha}T${hh}:${mm}:00${OFFSET_AR}`;
}

/** Clave del día de la semana ("lun".."dom") de una fecha "YYYY-MM-DD" en hora AR. */
export function diaSemanaAR(fecha: string): (typeof DIAS)[number] {
  const d = new Date(`${fecha}T12:00:00${OFFSET_AR}`);
  return DIAS[d.getUTCDay()];
}

/** Minutos desde medianoche (hora AR) de un timestamp ISO. */
export function minutosDelDiaAR(iso: string): number {
  const d = new Date(iso);
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const arMin = utcMin - OFFSET_MIN;
  return (arMin + 1440) % 1440;
}

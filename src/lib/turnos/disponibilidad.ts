/**
 * Motor de disponibilidad de turnos (lógica pura, sin dependencias externas).
 * Trabaja en "minutos desde medianoche" para un día dado; el caller convierte
 * a fechas reales (zona horaria Argentina) en una capa superior.
 */

export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minToHhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type IntervaloMin = { inicio: number; fin: number };

/**
 * Devuelve los inicios de slot disponibles (en minutos desde medianoche) para
 * un servicio de `duracionMin`, dentro de [aperturaMin, cierreMin), que no
 * choquen con `ocupados` respetando `margenMin` de preparación entre turnos.
 */
export function calcularSlots(opts: {
  aperturaMin: number;
  cierreMin: number;
  duracionMin: number;
  margenMin: number;
  ocupados: IntervaloMin[];
  stepMin?: number;
  desdeMin?: number;
}): number[] {
  const { aperturaMin, cierreMin, duracionMin, margenMin, ocupados } = opts;
  const stepMin = opts.stepMin ?? 30;
  const desdeMin = opts.desdeMin ?? 0;

  const slots: number[] = [];

  for (
    let inicio = aperturaMin;
    inicio + duracionMin <= cierreMin;
    inicio += stepMin
  ) {
    if (inicio < desdeMin) continue;
    const fin = inicio + duracionMin;
    // Conflicto si no hay al menos `margenMin` de separación con algún turno.
    const choca = ocupados.some(
      (o) => fin + margenMin > o.inicio && o.fin + margenMin > inicio,
    );
    if (!choca) slots.push(inicio);
  }

  return slots;
}

/** ¿Se puede cancelar/reprogramar un turno, dado el mínimo de horas de anticipación? */
export function puedeCancelar(opts: {
  fechaHoraIso: string;
  horasMinimas: number;
  ahoraIso: string;
}): boolean {
  const fechaHora = new Date(opts.fechaHoraIso).getTime();
  const ahora = new Date(opts.ahoraIso).getTime();
  const horasRestantes = (fechaHora - ahora) / (1000 * 60 * 60);
  return horasRestantes >= opts.horasMinimas;
}

/** Monto de la seña como porcentaje del precio, redondeado al peso. */
export function calcularMontoSena(precio: number, senaPorcentaje: number): number {
  return Math.round(precio * (senaPorcentaje / 100));
}

import type { Moneda } from "@/lib/tenant/tipos";

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

/**
 * Redondea un monto a lo que la moneda puede cobrar: ARS en pesos enteros, BRL en
 * centavos. Lo usan el servidor y el navegador, así los dos muestran y cobran lo mismo.
 */
export function redondearMonto(monto: number, moneda: Moneda): number {
  return moneda === "BRL" ? Math.round(monto * 100) / 100 : Math.round(monto);
}

/** Monto de la seña como porcentaje del precio, redondeado en la moneda del cliente. */
export function calcularMontoSena(precio: number, senaPorcentaje: number, moneda: Moneda): number {
  return redondearMonto(precio * (senaPorcentaje / 100), moneda);
}

/** ¿Se puede intentar una nueva reserva, dado cuántas ya se hicieron en la ventana (ej. la última hora)? */
export function puedeReservar(intentosEnVentana: number, maximo: number): boolean {
  return intentosEnVentana < maximo;
}

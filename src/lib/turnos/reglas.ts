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
 * Centavos enteros de un monto. `toPrecision(12)` corrige el error de coma flotante de
 * `monto * 100` (1.005 * 100 = 100.49999999999999 → 100.5) antes de redondear.
 */
function aCentavos(monto: number): number {
  return Math.round(Number((monto * 100).toPrecision(12)));
}

/** Lleva centavos a lo que la moneda puede cobrar: ARS en pesos enteros, BRL en centavos. */
function centavosEnMoneda(centavos: number, moneda: Moneda): number {
  return moneda === "BRL" ? centavos : Math.round(centavos / 100) * 100;
}

/** Monto ya redondeado en la moneda, en centavos enteros (para sumar sin errores). */
export function centavosDeMonto(monto: number, moneda: Moneda): number {
  return centavosEnMoneda(aCentavos(monto), moneda);
}

/** Seña en centavos enteros: el producto precio (centavos) × porcentaje es exacto. */
export function centavosDeSena(precio: number, senaPorcentaje: number, moneda: Moneda): number {
  const n = aCentavos(precio) * senaPorcentaje; // centavos × 100
  return moneda === "BRL" ? Math.round(n / 100) : Math.round(n / 10000) * 100;
}

/**
 * Redondea un monto a lo que la moneda puede cobrar: ARS en pesos enteros, BRL en
 * centavos. Lo usan el servidor y el navegador, así los dos muestran y cobran lo mismo.
 */
export function redondearMonto(monto: number, moneda: Moneda): number {
  return centavosDeMonto(monto, moneda) / 100;
}

/** Monto de la seña como porcentaje del precio, calculado en centavos enteros y redondeado en la moneda. */
export function calcularMontoSena(precio: number, senaPorcentaje: number, moneda: Moneda): number {
  return centavosDeSena(precio, senaPorcentaje, moneda) / 100;
}

/** ¿Se puede intentar una nueva reserva, dado cuántas ya se hicieron en la ventana (ej. la última hora)? */
export function puedeReservar(intentosEnVentana: number, maximo: number): boolean {
  return intentosEnVentana < maximo;
}

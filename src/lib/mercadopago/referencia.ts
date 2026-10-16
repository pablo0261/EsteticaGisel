import type { Moneda } from "@/lib/tenant/tipos";
import { centavosDeMonto, mismoMonto } from "@/lib/turnos/reglas";

/**
 * external_reference de las preferencias de Mercado Pago:
 * - "turno:<id>[,<id>...]": los turnos de una reserva.
 * - "curso:<id>:<centavos>": la compra de un curso, con el monto cobrado al crear la
 *   preferencia. Así el webhook acepta el precio de oferta aunque la oferta termine entre
 *   la preferencia y el pago.
 * - "curso:<id>": formato anterior (preferencias creadas antes del monto en la referencia).
 */
export type Referencia =
  | { tipo: "turno"; ids: string[] }
  | { tipo: "curso"; id: string; centavos: number | null };

export function referenciaCurso(id: string, monto: number, moneda: Moneda): string {
  return `curso:${id}:${centavosDeMonto(monto, moneda)}`;
}

export function parsearReferencia(ref: string | null): Referencia | null {
  const partes = (ref ?? "").split(":");
  if (partes[0] === "turno" && partes.length === 2) {
    const ids = partes[1].split(",");
    return ids.every((id) => id.length > 0) ? { tipo: "turno", ids } : null;
  }
  if (partes[0] === "curso" && partes[1] && partes.length <= 3) {
    if (partes.length === 2) return { tipo: "curso", id: partes[1], centavos: null };
    return /^\d+$/.test(partes[2]) ? { tipo: "curso", id: partes[1], centavos: Number(partes[2]) } : null;
  }
  return null;
}

/**
 * Compra con el formato nuevo: lo pagado tiene que ser el monto de la referencia, y ese monto
 * uno de los precios del curso (el normal o el de oferta), redondeados en la moneda.
 */
export function montoDeCompraValido(opts: {
  pagado: number;
  centavosEsperados: number;
  precio: number;
  precioOferta: number | null;
  moneda: Moneda;
}): boolean {
  const legitimos = [opts.precio, ...(opts.precioOferta == null ? [] : [opts.precioOferta])].map((p) =>
    centavosDeMonto(p, opts.moneda),
  );
  return legitimos.includes(opts.centavosEsperados) && mismoMonto(opts.pagado, opts.centavosEsperados / 100);
}

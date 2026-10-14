import type { Textos } from "@/lib/i18n/textos";
import type { Moneda } from "@/lib/tenant/tipos";
import { calcularMontoSena, redondearMonto } from "./reglas";

/**
 * Modo de pago de las reservas de un cliente (configuracion_negocio.modo_pago):
 * - ninguno: el turno se confirma al reservar, sin Mercado Pago.
 * - sena: se cobra un porcentaje del precio (comportamiento original).
 * - total: se cobra el precio completo.
 * Puro: lo usan la reserva (servidor) y el formulario de reserva (navegador).
 */
export type ModoPago = "ninguno" | "sena" | "total";

export const MODOS_PAGO: readonly ModoPago[] = ["ninguno", "sena", "total"];

export function esModoPago(valor: unknown): valor is ModoPago {
  return typeof valor === "string" && (MODOS_PAGO as readonly string[]).includes(valor);
}

export type CobroReserva =
  | { tipo: "sin_cobro" }
  /** El modo cobra, pero los servicios elegidos no tienen precio (a consultar). */
  | { tipo: "sin_precio" }
  /** Monto de cada servicio (en el orden recibido) y el total a cobrar. */
  | { tipo: "cobro"; montos: number[]; total: number };

/** Cada monto y el total quedan redondeados en la moneda (ARS en pesos, BRL en centavos). */
export function cobroDeReserva(
  modo: ModoPago,
  senaPorcentaje: number,
  precios: number[],
  moneda: Moneda,
): CobroReserva {
  if (modo === "ninguno") return { tipo: "sin_cobro" };
  const montos = precios.map((precio) =>
    modo === "total" ? redondearMonto(precio, moneda) : calcularMontoSena(precio, senaPorcentaje, moneda),
  );
  const total = redondearMonto(
    montos.reduce((suma, monto) => suma + monto, 0),
    moneda,
  );
  return total > 0 ? { tipo: "cobro", montos, total } : { tipo: "sin_precio" };
}

export const NOMBRE_MODO_PAGO: Record<ModoPago, Textos> = {
  ninguno: { es: "Sin pago anticipado", pt: "Sem pagamento antecipado" },
  sena: { es: "Seña", pt: "Sinal" },
  total: { es: "Pago total", pt: "Pagamento total" },
};

/** Cómo se paga al reservar (página de turnos del sitio). */
export function textoModoPago(modo: ModoPago, senaPorcentaje: number): Textos {
  if (modo === "ninguno") {
    return {
      es: "Sin pago anticipado: tu turno queda confirmado al reservar.",
      pt: "Sem pagamento antecipado: seu horário fica confirmado ao agendar.",
    };
  }
  if (modo === "sena") {
    return {
      es: `Reservá con una seña del ${senaPorcentaje}% del precio (se descuenta del total).`,
      pt: `Agende com um sinal de ${senaPorcentaje}% do valor (descontado do total).`,
    };
  }
  return {
    es: "Al reservar pagás el precio total del servicio.",
    pt: "Ao agendar, você paga o valor total do serviço.",
  };
}

/** Lo que se cobra en esta reserva, con el monto ya formateado. */
export function detalleCobro(modo: Exclude<ModoPago, "ninguno">, monto: string): Textos {
  if (modo === "sena") {
    return {
      es: `Reservás con una seña de ${monto} (se descuenta del precio total del servicio).`,
      pt: `Você agenda com um sinal de ${monto} (descontado do valor total do serviço).`,
    };
  }
  return {
    es: `Al reservar pagás ${monto}, el precio total.`,
    pt: `Ao agendar, você paga ${monto}, o valor total.`,
  };
}

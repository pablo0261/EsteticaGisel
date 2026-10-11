import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Valida un número de WhatsApp y lo devuelve en formato E.164 (ej. +5491123456789),
 * o null si no es válido. Por defecto asume Argentina.
 *
 * En Argentina los celulares llevan un 9 tras el +54 en formato internacional,
 * pero mucha gente escribe su celular sin 15 ni 9 (ej. "11 2345 6789"), que se
 * parsea como fijo: como el campo es de WhatsApp, se reinterpreta como celular.
 */
export function normalizarWhatsApp(input: string): string | null {
  const numero = parsePhoneNumberFromString(input, "AR");
  if (!numero?.isValid()) return null;

  if (numero.country !== "AR") return numero.number;

  if (numero.getType() === "MOBILE") return numero.number;

  const comoCelular = parsePhoneNumberFromString(`+549${numero.nationalNumber}`);
  return comoCelular?.isValid() && comoCelular.getType() === "MOBILE"
    ? comoCelular.number
    : null;
}

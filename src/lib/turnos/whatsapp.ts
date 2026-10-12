import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { Pais } from "@/lib/tenant/tipos";

/**
 * Valida un número de WhatsApp y lo devuelve en formato E.164 (ej. +5491123456789), o null
 * si no es válido. Un número sin código de país se interpreta según el país del negocio.
 *
 * - Argentina: los celulares llevan un 9 tras el +54 en formato internacional, pero mucha
 *   gente escribe su celular sin 15 ni 9 (ej. "11 2345 6789"), que se parsea como fijo.
 *   Como el campo es de WhatsApp, se reinterpreta como celular.
 * - Brasil: solo celulares (ej. "(11) 91234-5678"); los fijos se rechazan.
 * - Otros países: se aceptan si el número es válido.
 */
export function normalizarWhatsApp(input: string, pais: Pais): string | null {
  const numero = parsePhoneNumberFromString(input, pais);
  if (!numero?.isValid()) return null;

  if (numero.country === "BR") return numero.getType() === "MOBILE" ? numero.number : null;
  if (numero.country !== "AR") return numero.number;
  if (numero.getType() === "MOBILE") return numero.number;

  const comoCelular = parsePhoneNumberFromString(`+549${numero.nationalNumber}`);
  return comoCelular?.isValid() && comoCelular.getType() === "MOBILE"
    ? comoCelular.number
    : null;
}

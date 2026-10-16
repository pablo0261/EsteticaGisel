import { CONTROL } from "@/lib/master/formularios";

/**
 * Datos del cliente que reserva un turno (o compra un curso) desde el sitio público. Son
 * texto no confiable que termina en el destinatario de un email (nodemailer), en la
 * preferencia de Mercado Pago y en el evento de Calendar: tiene que ser UNA sola dirección.
 */
export const LARGO_MAXIMO_NOMBRE_CLIENTE = 80;
const LARGO_MAXIMO_EMAIL = 254;
const LARGO_MAXIMO_LOCAL = 64;

/** Parte local sin comillas: átomos separados por puntos (RFC 5322 dot-atom), sin espacios ni , ; < > " ( ) [ ] \ : @. */
const LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
/** Dominio con al menos un punto; cada etiqueta de letras, dígitos y guiones (sin guion en los extremos). */
const DOMINIO = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Una sola dirección local@dominio, normalizada (sin espacios alrededor y en minúsculas), o
 * null. Estricta a propósito: rechaza listas (comas, punto y coma, espacios), nombres con
 * <...>, comillas y saltos de línea, que nodemailer interpretaría como más destinatarios.
 * Los dominios internacionales se aceptan solo en punycode (xn--...).
 */
export function validarEmailCliente(entrada: string): string | null {
  const email = entrada.trim().toLowerCase();
  if (email.length === 0 || email.length > LARGO_MAXIMO_EMAIL) return null;
  const partes = email.split("@");
  if (partes.length !== 2) return null;
  const [local, dominio] = partes;
  if (local.length > LARGO_MAXIMO_LOCAL) return null;
  return LOCAL.test(local) && DOMINIO.test(dominio) ? email : null;
}

/** Nombre sin espacios alrededor, de 1 a 80 caracteres y sin caracteres de control, o null. */
export function validarNombreCliente(entrada: string): string | null {
  const nombre = entrada.trim();
  if (nombre.length === 0 || nombre.length > LARGO_MAXIMO_NOMBRE_CLIENTE) return null;
  return CONTROL.test(nombre) ? null : nombre;
}

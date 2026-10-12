import { createHash } from "node:crypto";

/** Recuperación de contraseña: límites por hora y validación de la contraseña nueva. */
export const LARGO_MINIMO_CONTRASENA = 8;
export const MAX_RECUPERACIONES_POR_EMAIL = 3;
export const MAX_RECUPERACIONES_POR_IP = 10;

export function normalizarEmail(entrada: string): string | null {
  const email = entrada.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Para contar pedidos sin guardar emails en claro (también los de cuentas que no existen). */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export function recuperacionPermitida(enLaHoraPorEmail: number, enLaHoraPorIp: number): boolean {
  return enLaHoraPorEmail < MAX_RECUPERACIONES_POR_EMAIL && enLaHoraPorIp < MAX_RECUPERACIONES_POR_IP;
}

export type ProblemaContrasena = "contrasena_corta" | "contrasena_distinta";

export function validarNuevaContrasena(clave: string, confirmacion: string): ProblemaContrasena | null {
  if (clave.length < LARGO_MINIMO_CONTRASENA) return "contrasena_corta";
  if (clave !== confirmacion) return "contrasena_distinta";
  return null;
}

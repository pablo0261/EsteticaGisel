import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie que marca la sesión como verificada con el segundo factor. La usa el proxy
 * (runtime Node.js), así que este módulo no importa server-only.
 */
export const COOKIE_MFA = "mfa";

/** 32 bytes aleatorios en base64url son 43 caracteres. */
export const LARGO_MINIMO_SECRETO = 32;
const VERSION = "v1";

export function secretoMfaValido(secreto: string | undefined): secreto is string {
  return typeof secreto === "string" && secreto.length >= LARGO_MINIMO_SECRETO;
}

/**
 * Valor de la cookie: HMAC sobre el usuario y el session_id del JWT de Supabase. Otra
 * sesión (un login nuevo, o después de cerrar sesión) tiene otro session_id: la cookie
 * deja de valer.
 */
export function firmarMfa(secreto: string, userId: string, sessionId: string): string {
  const firma = createHmac("sha256", secreto).update(`mfa|${userId}|${sessionId}`).digest("base64url");
  return `${VERSION}.${firma}`;
}

export function verificarMfa(
  secreto: string | undefined,
  valor: string | undefined,
  userId: string | undefined,
  sessionId: string | undefined,
): boolean {
  if (!secretoMfaValido(secreto) || !valor || !userId || !sessionId) return false;
  const esperado = Buffer.from(firmarMfa(secreto, userId, sessionId));
  const recibido = Buffer.from(valor);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

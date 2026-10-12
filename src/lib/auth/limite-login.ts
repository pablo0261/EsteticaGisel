/** Límite de intentos de login (email y contraseña). Puro: la base la maneja servicio.ts. */
export const VENTANA_LOGIN_MS = 15 * 60 * 1000;
export const MAX_FALLIDOS_POR_EMAIL = 5;
export const MAX_FALLIDOS_POR_IP = 20;

/** Intentos fallidos en la ventana, por email y por IP. */
export function loginPermitido(fallidosPorEmail: number, fallidosPorIp: number): boolean {
  return fallidosPorEmail < MAX_FALLIDOS_POR_EMAIL && fallidosPorIp < MAX_FALLIDOS_POR_IP;
}

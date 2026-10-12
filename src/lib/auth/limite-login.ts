/** Límite de intentos de login (email y contraseña). Puro: la base la maneja servicio.ts. */
export const VENTANA_LOGIN_MS = 15 * 60 * 1000;
/** Con IP conocida: fallidos de este email desde esta IP. */
export const MAX_FALLIDOS_POR_EMAIL_E_IP = 5;
/** Con IP conocida: fallidos desde esta IP, con cualquier email. */
export const MAX_FALLIDOS_POR_IP = 20;
/** Con IP conocida: tope flojo de fallidos de este email desde todas las IP. */
export const MAX_FALLIDOS_POR_EMAIL = 50;
/** Sin IP conocida: fallidos de este email. */
export const MAX_FALLIDOS_POR_EMAIL_SIN_IP = 5;

/**
 * Intentos fallidos en la ventana. `ip` es null si la IP del cliente es desconocida.
 * - Con IP: el límite estricto es por (email, IP), así un tercero desde otra IP no traba la
 *   cuenta de su dueño; se suman un límite por IP y un tope flojo por email.
 * - Sin IP (CABECERA_IP_CONFIABLE sin configurar): solo queda limitar por email, y entonces
 *   cualquiera puede trabar una cuenta 15 minutos con 5 contraseñas malas. Por eso en
 *   producción hay que configurar CABECERA_IP_CONFIABLE.
 */
export function loginPermitido(fallidos: {
  porEmail: number;
  ip: { porEmailEIp: number; porIp: number } | null;
}): boolean {
  const { porEmail, ip } = fallidos;
  if (ip === null) return porEmail < MAX_FALLIDOS_POR_EMAIL_SIN_IP;
  return ip.porEmailEIp < MAX_FALLIDOS_POR_EMAIL_E_IP && ip.porIp < MAX_FALLIDOS_POR_IP && porEmail < MAX_FALLIDOS_POR_EMAIL;
}

/**
 * ¿El error de signInWithPassword es el límite de pedidos de Supabase (no una contraseña
 * mala)? Ese caso no cuenta como intento fallido: si contara, Supabase ocupado trabaría cuentas.
 */
export function limiteDeSupabase(error: { status?: number; code?: string } | null): boolean {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

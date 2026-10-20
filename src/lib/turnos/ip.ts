import { headers } from "next/headers";

export const LARGO_MAXIMO_IP = 64;

type Cabeceras = { get(nombre: string): string | null };

/**
 * IP del cliente leída SOLO de la cabecera que fija el reverse proxy de confianza
 * (CABECERA_IP_CONFIABLE, ej. "x-real-ip" con Caddy). x-forwarded-for no se usa: si el
 * contenedor queda expuesto directo, el cliente la manda con cualquier valor.
 * null si no hay cabecera configurada o no vino: los límites por IP se saltean (los por
 * email siguen) en vez de juntar a todos en un mismo balde.
 */
export function ipDeCabecera(cabeceras: Cabeceras, nombreCabecera: string | undefined): string | null {
  const nombre = nombreCabecera?.trim().toLowerCase();
  if (!nombre) return null;
  let valor: string | null;
  try {
    valor = cabeceras.get(nombre);
  } catch {
    return null; // nombre de cabecera inválido
  }
  const ip = valor?.trim().slice(0, LARGO_MAXIMO_IP);
  return ip ? ip : null;
}

/**
 * En producción, sin la IP que fija el proxy no hay límite real: las reservas y el ingreso
 * se rechazan en vez de seguir (un cliente podría omitir la cabecera o trabar cuentas).
 */
export function bloqueadoSinIp(entorno: string | undefined, ip: string | null): boolean {
  return entorno === "production" && !ip;
}

/** IP del cliente actual (ver ipDeCabecera). */
export async function getClientIp(): Promise<string | null> {
  return ipDeCabecera(await headers(), process.env.CABECERA_IP_CONFIABLE);
}

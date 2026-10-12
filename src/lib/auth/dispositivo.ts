import { createHash, randomBytes } from "node:crypto";

/** "Recordar este dispositivo por 30 días": token en la cookie, su hash en la base. */
export const COOKIE_DISPOSITIVO = "dispositivo";
export const VIGENCIA_DISPOSITIVO_MS = 30 * 24 * 60 * 60 * 1000;

export function generarTokenDispositivo(): string {
  return randomBytes(32).toString("base64url");
}

/** El token tiene 256 bits aleatorios: alcanza un SHA-256 (sin secreto) para guardarlo. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenConFormato(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** null = no existe o fue revocado (se borró la fila). */
export function dispositivoVigente(fila: { expira_en: string } | null, ahora: Date): boolean {
  return !!fila && new Date(fila.expira_en).getTime() > ahora.getTime();
}

export function vencimientoDispositivo(ahora: Date): Date {
  return new Date(ahora.getTime() + VIGENCIA_DISPOSITIVO_MS);
}

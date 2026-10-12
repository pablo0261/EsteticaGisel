import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Reglas del código de 6 dígitos del login (spec 6.3). Puro: la base la maneja servicio.ts. */
export const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;
export const MAX_INTENTOS = 5;
export const ESPERA_REENVIO_MS = 60 * 1000;
export const MAX_CODIGOS_POR_HORA = 5;

export function generarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** "123 456" o "123-456" → "123456". null si no son 6 dígitos. */
export function normalizarCodigo(entrada: string): string | null {
  const digitos = entrada.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digitos) ? digitos : null;
}

/** HMAC-SHA256 del código, ligado al usuario: el mismo código de otro usuario da otro hash. */
export function hashCodigo(secreto: string, userId: string, codigo: string): string {
  return createHmac("sha256", secreto).update(`codigo-login|${userId}|${codigo}`).digest("hex");
}

/** Comparación en tiempo constante. */
export function mismoHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type FilaCodigo = { expira_en: string; intentos: number; usado_en: string | null };
export type EstadoCodigo = "vigente" | "vencido" | "agotado" | "usado";

export function estadoCodigo(fila: FilaCodigo, ahora: Date): EstadoCodigo {
  if (fila.usado_en) return "usado";
  if (new Date(fila.expira_en).getTime() <= ahora.getTime()) return "vencido";
  if (fila.intentos >= MAX_INTENTOS) return "agotado";
  return "vigente";
}

/** Resultado de comprobar un código ingresado (servicio.ts). */
export type ResultadoCodigo =
  | "ok"
  | "incorrecto"
  | "reintentar"
  | "sin_codigo"
  | Exclude<EstadoCodigo, "vigente">;

export type PermisoEnvio =
  | { ok: true }
  | { ok: false; motivo: "espera"; segundos: number }
  | { ok: false; motivo: "limite" };

/** ¿Se puede generar y enviar otro código? Último envío y cantidad en la última hora. */
export function permisoEnvio(ultimoCreadoEn: Date | null, enLaUltimaHora: number, ahora: Date): PermisoEnvio {
  if (enLaUltimaHora >= MAX_CODIGOS_POR_HORA) return { ok: false, motivo: "limite" };
  if (ultimoCreadoEn) {
    const falta = ultimoCreadoEn.getTime() + ESPERA_REENVIO_MS - ahora.getTime();
    if (falta > 0) return { ok: false, motivo: "espera", segundos: Math.ceil(falta / 1000) };
  }
  return { ok: true };
}

export function vencimientoCodigo(ahora: Date): Date {
  return new Date(ahora.getTime() + VIGENCIA_CODIGO_MS);
}

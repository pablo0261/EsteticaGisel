import { createHmac, timingSafeEqual } from "node:crypto";

/** El "Conectar calendario" vale 10 minutos: después hay que empezar de nuevo. */
export const VIGENCIA_ESTADO_MS = 10 * 60 * 1000;

function firma(secreto: string, cuerpo: string): string {
  return createHmac("sha256", secreto).update(`google-oauth|${cuerpo}`).digest("base64url");
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** state de OAuth: ata el retorno al tenant y a un vencimiento. */
export function crearEstadoOauth(secreto: string, tenantId: string, ahoraMs: number): string {
  const cuerpo = `${tenantId}.${ahoraMs + VIGENCIA_ESTADO_MS}`;
  return `${cuerpo}.${firma(secreto, cuerpo)}`;
}

/** El tenant del state, o null si está vencido, alterado o no es un UUID. */
export function leerEstadoOauth(secreto: string, valor: string, ahoraMs: number): string | null {
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [tenantId, expiraTxt, recibida] = partes;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) return null;
  if (!/^\d{10,16}$/.test(expiraTxt)) return null;
  const expira = Number(expiraTxt);
  if (!Number.isFinite(expira) || expira < ahoraMs) return null;
  const cuerpo = `${tenantId}.${expiraTxt}`;
  return iguales(firma(secreto, cuerpo), recibida) ? tenantId : null;
}

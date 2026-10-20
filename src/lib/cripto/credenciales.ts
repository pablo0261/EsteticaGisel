import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de las credenciales de los clientes (spec 4.3): AES-256-GCM con CREDENCIALES_KEY.
 * Formato "v1.<iv>.<tag>.<cifrado>" en base64url. El AAD lleva el tenant y la columna: un
 * valor cifrado no se puede copiar a otro tenant ni a otra columna (no se descifra).
 * Puro: la clave la recibe por parámetro (ver clave.ts).
 */
export const VERSION_CIFRADO = "v1";
const LARGO_CLAVE = 32;
const LARGO_IV = 12;
const LARGO_TAG = 16;

/** Columnas de tenant_credenciales que se guardan cifradas. */
export type ColumnaCifrada =
  | "mp_access_token"
  | "mp_refresh_token"
  | "mp_webhook_secret"
  | "smtp_password"
  | "google_client_secret"
  | "google_refresh_token";

export type ContextoCifrado = { tenantId: string; columna: ColumnaCifrada };

/** CREDENCIALES_KEY: 32 bytes en base64url. Lanza si falta o no tiene ese largo. */
export function claveDesdeTexto(valor: string | undefined): Buffer {
  const texto = valor?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]+$/.test(texto)) {
    throw new Error("CREDENCIALES_KEY ausente o con caracteres que no son base64url");
  }
  const clave = Buffer.from(texto, "base64url");
  if (clave.length !== LARGO_CLAVE) throw new Error("CREDENCIALES_KEY tiene que tener 32 bytes en base64url");
  return clave;
}

function validarClave(clave: Buffer): void {
  if (clave.length !== LARGO_CLAVE) throw new Error("Clave de cifrado inválida");
}

function aad(contexto: ContextoCifrado): Buffer {
  return Buffer.from(`${VERSION_CIFRADO}|${contexto.tenantId}|${contexto.columna}`, "utf8");
}

export function cifrar(clave: Buffer, texto: string, contexto: ContextoCifrado): string {
  validarClave(clave);
  const iv = randomBytes(LARGO_IV);
  const cipher = createCipheriv("aes-256-gcm", clave, iv, { authTagLength: LARGO_TAG });
  cipher.setAAD(aad(contexto));
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION_CIFRADO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

/** Lanza si el formato no es v1, la clave no es la correcta, o el valor se alteró o es de otro tenant o columna. */
export function descifrar(clave: Buffer, valor: string, contexto: ContextoCifrado): string {
  validarClave(clave);
  const partes = valor.split(".");
  if (partes.length !== 4 || partes[0] !== VERSION_CIFRADO) {
    throw new Error("Formato de credencial cifrada desconocido");
  }
  const iv = Buffer.from(partes[1], "base64url");
  const tag = Buffer.from(partes[2], "base64url");
  const cifrado = Buffer.from(partes[3], "base64url");
  if (iv.length !== LARGO_IV || tag.length !== LARGO_TAG) throw new Error("Credencial cifrada inválida");
  const decipher = createDecipheriv("aes-256-gcm", clave, iv, { authTagLength: LARGO_TAG });
  decipher.setAAD(aad(contexto));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}

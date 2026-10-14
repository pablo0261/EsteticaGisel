import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET_SITIOS,
  detectarFormato,
  MIME_FORMATO,
  pathImagen,
  pathImagenGaleria,
  urlPublica,
  type FormatoImagen,
  type TipoImagen,
} from "./imagenes";

/** URL del proyecto de Supabase (la misma de las URLs públicas de las imágenes). */
export function urlSupabase(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/**
 * Sube una imagen ya validada. El Content-Type y la extensión salen del formato real
 * (bytes mágicos), nunca del navegador: si el formato no coincide con los bytes, no sube.
 */
export async function subirImagenSitio(
  tenantId: string,
  tipo: TipoImagen,
  bytes: Buffer,
  formato: FormatoImagen,
): Promise<{ path: string; url: string }> {
  if (detectarFormato(bytes) !== formato) throw new Error("El formato no coincide con el contenido de la imagen");
  const path = pathImagen(tenantId, tipo, formato, new Date());
  const { error } = await createAdminClient()
    .storage.from(BUCKET_SITIOS)
    // Cada subida tiene una URL nueva: un día de caché, y una imagen reemplazada no queda años en la CDN.
    .upload(path, bytes, { contentType: MIME_FORMATO[formato], cacheControl: "86400", upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return { path, url: urlPublica(urlSupabase(), path) };
}

export async function borrarImagenSitio(path: string): Promise<void> {
  const { error } = await createAdminClient().storage.from(BUCKET_SITIOS).remove([path]);
  if (error) throw new Error(`No se pudo borrar la imagen: ${error.message}`);
}

/**
 * Sube una imagen de la galería ya validada y devuelve su URL pública. Igual que las de la
 * marca: Content-Type y extensión del formato real, una URL nueva por subida.
 */
export async function subirImagenGaleria(tenantId: string, bytes: Buffer, formato: FormatoImagen): Promise<string> {
  if (detectarFormato(bytes) !== formato) throw new Error("El formato no coincide con el contenido de la imagen");
  const path = pathImagenGaleria(tenantId, formato, new Date(), randomBytes(4).toString("hex"));
  const { error } = await createAdminClient()
    .storage.from(BUCKET_SITIOS)
    .upload(path, bytes, { contentType: MIME_FORMATO[formato], cacheControl: "86400", upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return urlPublica(urlSupabase(), path);
}

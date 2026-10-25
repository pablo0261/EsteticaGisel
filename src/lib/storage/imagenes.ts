/**
 * Imágenes de la marca de cada cliente (logo, logo claro y foto de perfil) en el bucket
 * público "sitios". Puro: valida el contenido real (bytes mágicos), no la extensión ni el
 * MIME que manda el navegador. SVG nunca: puede llevar scripts.
 */
export const BUCKET_SITIOS = "sitios";
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

export const TIPOS_IMAGEN = ["logo", "logo_claro", "foto_perfil"] as const;
export type TipoImagen = (typeof TIPOS_IMAGEN)[number];
export type FormatoImagen = "png" | "jpg" | "webp";

export const MIME_FORMATO: Record<FormatoImagen, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Columna de tenant_marca de cada imagen. */
export const COLUMNA_IMAGEN: Record<TipoImagen, "logo_url" | "logo_claro_url" | "foto_perfil_url"> = {
  logo: "logo_url",
  logo_claro: "logo_claro_url",
  foto_perfil: "foto_perfil_url",
};

/** Campo de Marca (tipos.ts) de cada imagen. */
export const CAMPO_MARCA_IMAGEN: Record<TipoImagen, "logoUrl" | "logoClaroUrl" | "fotoPerfilUrl"> = {
  logo: "logoUrl",
  logo_claro: "logoClaroUrl",
  foto_perfil: "fotoPerfilUrl",
};

export function esTipoImagen(valor: string): valor is TipoImagen {
  return (TIPOS_IMAGEN as readonly string[]).includes(valor);
}

/** Formato según los primeros bytes. Cualquier otra cosa (SVG, GIF, HTML…): null. */
export function detectarFormato(bytes: Uint8Array): FormatoImagen | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b);
  if (empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (empieza([0xff, 0xd8, 0xff])) return "jpg";
  // "RIFF" + 4 bytes de largo + "WEBP"
  if (empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export type ProblemaImagen = "imagen_vacia" | "imagen_grande" | "imagen_tipo";

/** Se puede usar con el size del archivo, antes de leerlo. */
export function validarTamano(bytes: number): ProblemaImagen | null {
  if (bytes <= 0) return "imagen_vacia";
  if (bytes > MAX_BYTES_IMAGEN) return "imagen_grande";
  return null;
}

export function validarImagen(
  bytes: Uint8Array,
): { ok: true; formato: FormatoImagen } | { ok: false; error: ProblemaImagen } {
  const problema = validarTamano(bytes.length);
  if (problema) return { ok: false, error: problema };
  const formato = detectarFormato(bytes);
  return formato ? { ok: true, formato } : { ok: false, error: "imagen_tipo" };
}

/** {tenant_id}/{tipo}-{timestamp}.{ext}: cada subida tiene una URL nueva (sin caché vieja). */
export function pathImagen(tenantId: string, tipo: TipoImagen, formato: FormatoImagen, ahora: Date): string {
  return `${tenantId}/${tipo}-${ahora.getTime()}.${formato}`;
}

/** <supabase>/storage/v1/object/public/sitios/ */
export function prefijoPublico(urlSupabase: string): string {
  return `${urlSupabase.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_SITIOS}/`;
}

export function urlPublica(urlSupabase: string, path: string): string {
  return `${prefijoPublico(urlSupabase)}${path}`;
}

const ARCHIVO_PROPIO = /^(logo|logo_claro|foto_perfil)-\d+\.(png|jpg|webp)$/;

/**
 * Path del objeto de una URL guardada en tenant_marca, solo si es una imagen subida por el
 * panel a la carpeta de ese tenant. Las rutas del sitio ("/tenants/…") o de otro tenant dan
 * null: nunca se borra algo ajeno.
 */
export function pathDeUrlPublica(url: string | null, urlSupabase: string, tenantId: string): string | null {
  if (!url) return null;
  const prefijo = prefijoPublico(urlSupabase);
  if (!url.startsWith(prefijo)) return null;
  const path = url.slice(prefijo.length);
  const carpeta = `${tenantId}/`;
  if (!path.startsWith(carpeta)) return null;
  return ARCHIVO_PROPIO.test(path.slice(carpeta.length)) ? path : null;
}

/**
 * Imagen de la galería: {tenant_id}/galeria-{ms}-{sufijo}.{ext}. El sufijo (8 hex
 * aleatorios) evita que dos subidas del mismo milisegundo se pisen.
 */
export function pathImagenGaleria(tenantId: string, formato: FormatoImagen, ahora: Date, sufijo: string): string {
  if (!/^[0-9a-f]{8}$/.test(sufijo)) throw new Error("Sufijo de imagen inválido");
  return `${tenantId}/galeria-${ahora.getTime()}-${sufijo}.${formato}`;
}

const ARCHIVO_GALERIA = /^galeria-\d+-[0-9a-f]{8}\.(png|jpg|webp)$/;

/** Path de una imagen de la galería de ese tenant (para borrarla), o null si la URL no es una. */
export function pathDeImagenGaleria(url: string | null, urlSupabase: string, tenantId: string): string | null {
  if (!url) return null;
  const prefijo = prefijoPublico(urlSupabase);
  if (!url.startsWith(prefijo)) return null;
  const path = url.slice(prefijo.length);
  const carpeta = `${tenantId}/`;
  if (!path.startsWith(carpeta)) return null;
  return ARCHIVO_GALERIA.test(path.slice(carpeta.length)) ? path : null;
}

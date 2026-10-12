/**
 * Textos en los idiomas de la plataforma, sin librerías. Este módulo es puro: lo usan
 * el servidor (con traducir/traductor y el idioma del tenant) y el cliente (vía cliente.tsx).
 */

/** Idiomas de la plataforma. Sumar uno acá obliga (por tipos) a traducir cada texto. */
export type Idioma = "es" | "pt";

/** Un texto en todos los idiomas. Si falta una clave, no compila. */
export type Textos = Record<Idioma, string>;

/** Idioma cuando no hay tenant (rutas sin tenant, errores antes de resolverlo). */
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Locale de Intl (fechas y números) y del atributo lang del HTML. */
export const LOCALES: Record<Idioma, string> = { es: "es-AR", pt: "pt-BR" };

export function traducir(idioma: Idioma, textos: Textos): string {
  return textos[idioma];
}

/** Función de traducción con el idioma fijo: `const t = traductor(tenant.idioma)`. */
export function traductor(idioma: Idioma): (textos: Textos) => string {
  return (textos) => traducir(idioma, textos);
}

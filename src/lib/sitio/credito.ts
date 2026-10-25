import { traducir, type Idioma, type Textos } from "@/lib/i18n/textos";

/** Crédito del pie. Sin nombre de persona: solo la marca del producto. */
export const URL_CERTEA = "https://certea.com.br";

export const TEXTO_CREDITO: Textos = {
  es: "Sitio creado por Certea",
  pt: "Site criado por Certea",
};

/** null cuando el tenant lo tiene apagado (el default). */
export function creditoVisible(mostrar: boolean, idioma: Idioma): { texto: string; href: string } | null {
  if (!mostrar) return null;
  return { texto: traducir(idioma, TEXTO_CREDITO), href: URL_CERTEA };
}

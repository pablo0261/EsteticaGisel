import type { Textos } from "@/lib/i18n/textos";
import type { Modulos } from "@/lib/tenant/tipos";

/**
 * Menú del sitio público: solo enlaza secciones que se muestran y tienen contenido. Puro:
 * el layout del sitio le pasa lo que encontró en la base (src/lib/data/contenido.ts).
 */
export type EnlaceSitio = "servicios" | "sobre-mi" | "testimonios" | "galeria" | "preguntas" | "cursos" | "contacto";

/** ¿Hay al menos un elemento visible en cada sección? */
export type ContenidoSitio = {
  servicios: boolean;
  testimonios: boolean;
  galeria: boolean;
  preguntas: boolean;
  cursos: boolean;
};

export const DESTINO_ENLACE: Record<EnlaceSitio, { href: string; etiqueta: Textos }> = {
  servicios: { href: "/#servicios", etiqueta: { es: "Servicios", pt: "Serviços" } },
  "sobre-mi": { href: "/#sobre-mi", etiqueta: { es: "Sobre mí", pt: "Sobre mim" } },
  testimonios: { href: "/#testimonios", etiqueta: { es: "Testimonios", pt: "Depoimentos" } },
  galeria: { href: "/#galeria", etiqueta: { es: "Galería", pt: "Galeria" } },
  preguntas: { href: "/#preguntas-frecuentes", etiqueta: { es: "Preguntas frecuentes", pt: "Perguntas frequentes" } },
  cursos: { href: "/cursos", etiqueta: { es: "Cursos", pt: "Cursos" } },
  contacto: { href: "/#contacto", etiqueta: { es: "Contacto", pt: "Contato" } },
};

export function enlacesDelSitio(modulos: Modulos, contenido: ContenidoSitio): EnlaceSitio[] {
  const enlaces: EnlaceSitio[] = [];
  if (contenido.servicios) enlaces.push("servicios");
  // La sección "sobre mí" siempre tiene contenido (su título o el nombre del negocio).
  if (modulos.sobreMi) enlaces.push("sobre-mi");
  if (modulos.testimonios && contenido.testimonios) enlaces.push("testimonios");
  if (modulos.galeria && contenido.galeria) enlaces.push("galeria");
  if (modulos.faq && contenido.preguntas) enlaces.push("preguntas");
  if (modulos.cursos && contenido.cursos) enlaces.push("cursos");
  enlaces.push("contacto");
  return enlaces;
}

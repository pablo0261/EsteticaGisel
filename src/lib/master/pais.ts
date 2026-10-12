import type { Idioma } from "@/lib/i18n/textos";
import type { Moneda, Pais } from "@/lib/tenant/tipos";

/** Países de la plataforma y sus valores por defecto (puro: lo usa también el formulario en el navegador). */
export const PAISES: readonly Pais[] = ["AR", "BR"];
export const IDIOMAS: readonly Idioma[] = ["es", "pt"];
export const MONEDAS: readonly Moneda[] = ["ARS", "BRL"];

export const NOMBRE_PAIS: Record<Pais, string> = { AR: "Argentina", BR: "Brasil" };
export const NOMBRE_IDIOMA: Record<Idioma, string> = { es: "Español", pt: "Portugués" };

/** Zonas IANA permitidas por país. La primera es la de por defecto. Brasil tiene varias. */
export const ZONAS_HORARIAS: Record<Pais, readonly string[]> = {
  AR: ["America/Argentina/Buenos_Aires"],
  BR: [
    "America/Sao_Paulo",
    "America/Bahia",
    "America/Fortaleza",
    "America/Recife",
    "America/Belem",
    "America/Manaus",
    "America/Cuiaba",
    "America/Campo_Grande",
    "America/Porto_Velho",
    "America/Boa_Vista",
    "America/Rio_Branco",
    "America/Noronha",
  ],
};

export type ValoresPais = { idioma: Idioma; zonaHoraria: string; moneda: Moneda };

export const VALORES_POR_PAIS: Record<Pais, ValoresPais> = {
  AR: { idioma: "es", zonaHoraria: "America/Argentina/Buenos_Aires", moneda: "ARS" },
  BR: { idioma: "pt", zonaHoraria: "America/Sao_Paulo", moneda: "BRL" },
};

export function esPais(valor: string): valor is Pais {
  return (PAISES as readonly string[]).includes(valor);
}

export function esIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

export function esMoneda(valor: string): valor is Moneda {
  return (MONEDAS as readonly string[]).includes(valor);
}

export function zonaPermitida(pais: Pais, zona: string): boolean {
  return ZONAS_HORARIAS[pais].includes(zona);
}

import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import type { Moneda } from "@/lib/tenant/tipos";

const FORMATO_MONEDA: Record<Moneda, { simbolo: string; decimales: number }> = {
  ARS: { simbolo: "$", decimales: 0 },
  BRL: { simbolo: "R$", decimales: 2 },
};

/**
 * Formatea un monto en la moneda del tenant: "$ 35.000" (ARS, sin decimales) o
 * "R$ 350,00" (BRL, con 2 decimales). Los separadores siguen el idioma del sitio.
 */
export function formatPrecio(monto: number, moneda: Moneda, idioma: Idioma): string {
  const { simbolo, decimales } = FORMATO_MONEDA[moneda];
  const n = new Intl.NumberFormat(LOCALES[idioma], {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
  return `${simbolo} ${n}`;
}

/** Formatea una duración en minutos: "1h 30min", "1h", "40min". */
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

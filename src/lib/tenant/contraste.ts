import { esColorHex, type ColoresMarca } from "./estilo";

/**
 * Legibilidad de la paleta de un tenant (WCAG 2, luminancia relativa). Puro: lo usan la
 * vista previa del panel master (en el navegador) y la action que guarda los colores.
 */
export const MINIMO_TEXTO = 4.5;
export const MINIMO_SECUNDARIO = 3;

/** "#ABC" → "#aabbcc". null si no es #rgb o #rrggbb. */
export function normalizarHex(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  if (!esColorHex(v)) return null;
  if (v.length === 4) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return v;
}

function canal(valor: number): number {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa: 0 (negro) a 1 (blanco). Lanza si el color no es válido. */
export function luminancia(hex: string): number {
  const n = normalizarHex(hex);
  if (!n) throw new Error(`Color inválido: ${hex}`);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste: de 1 (iguales) a 21 (negro y blanco). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type ClaveContraste = "contraste_texto" | "contraste_boton" | "contraste_secundario";

export type ProblemaContraste = {
  clave: ClaveContraste;
  ratio: number;
  minimo: number;
  /** true: no se puede guardar. false: es un aviso. */
  bloquea: boolean;
};

/** Problemas de legibilidad de una paleta con los 4 colores válidos (lanza si alguno no lo es). */
export function evaluarPaleta(c: ColoresMarca): ProblemaContraste[] {
  const reglas: ProblemaContraste[] = [
    { clave: "contraste_texto", ratio: contraste(c.colorTexto, c.colorFondo), minimo: MINIMO_TEXTO, bloquea: true },
    // Los botones son bg-primario con text-fondo.
    { clave: "contraste_boton", ratio: contraste(c.colorFondo, c.colorPrimario), minimo: MINIMO_TEXTO, bloquea: true },
    {
      clave: "contraste_secundario",
      ratio: contraste(c.colorSecundario, c.colorFondo),
      minimo: MINIMO_SECUNDARIO,
      bloquea: false,
    },
  ];
  return reglas.filter((r) => r.ratio < r.minimo);
}

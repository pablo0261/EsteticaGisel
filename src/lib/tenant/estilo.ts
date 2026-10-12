import type { CSSProperties } from "react";
import type { Marca } from "./tipos";

const VARIABLES = {
  colorPrimario: "--marca-primario",
  colorSecundario: "--marca-secundario",
  colorFondo: "--marca-fondo",
  colorTexto: "--marca-texto",
} as const;

export type ColoresMarca = Pick<Marca, keyof typeof VARIABLES>;

/**
 * #rgb o #rrggbb, sin transparencia (con alfa no se puede calcular el contraste de la
 * paleta). Cualquier otra cosa podría inyectar CSS en el style.
 */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** ¿Es un color hex válido? (también lo usan los emails con la marca) */
export function esColorHex(valor: string): boolean {
  return HEX.test(valor.trim());
}

/**
 * Variables CSS con los 4 colores base del tenant, para el style del layout. globals.css
 * deriva de ellas las clases (bg-primario, text-texto-suave…). Un color inválido se omite
 * y queda el valor por defecto de :root.
 */
export function estiloMarca(colores: ColoresMarca): CSSProperties {
  const estilo: CSSProperties & Record<string, string> = {};
  for (const campo of Object.keys(VARIABLES) as (keyof ColoresMarca)[]) {
    const valor = colores[campo].trim();
    if (esColorHex(valor)) estilo[VARIABLES[campo]] = valor;
  }
  return estilo;
}

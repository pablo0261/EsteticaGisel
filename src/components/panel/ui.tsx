import type { Idioma } from "@/lib/i18n/textos";
import { mensajeError, mensajeInfo } from "@/lib/panel/mensajes";

/** Piezas comunes del panel del cliente (colores de la marca, idioma del cliente). */
export const TITULO = "font-serif text-4xl text-texto";
export const SUBTITULO = "mt-2 font-sans text-sm text-texto-suave";
export const ETIQUETA = "font-sans text-sm text-texto-suave";
export const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const CAMPO_EN_LINEA =
  "rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const BOTON =
  "rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
export const BOTON_SECUNDARIO =
  "rounded-full bg-secundario px-4 py-2 font-sans text-sm text-fondo transition hover:bg-secundario-oscuro disabled:opacity-60";
export const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro disabled:opacity-60";
export const TARJETA = "rounded-2xl border border-primario/15 bg-white/60 p-5";
export const FILA = "rounded-xl border border-primario/15 bg-white/60 p-3";
export const AYUDA = "mt-1 font-sans text-xs text-texto-suave";
export const CASILLA = "flex items-center gap-2 font-sans text-sm text-texto-suave";

/** Query de las pantallas del panel: claves de mensajes.ts, nunca textos. */
export type ParamsPanel = { error?: string; ok?: string };

export function Mensajes({ idioma, params }: { idioma: Idioma; params: ParamsPanel }) {
  const error = mensajeError(idioma, params.error);
  const info = mensajeInfo(idioma, params.ok);
  return (
    <>
      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="mb-6 rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
          {info}
        </p>
      )}
    </>
  );
}

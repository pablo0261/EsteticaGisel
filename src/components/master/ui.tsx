import { mensajeAviso, mensajeError, mensajeInfo } from "@/lib/master/mensajes";

/** Piezas comunes del panel master (español, paleta de la plataforma). */
export const ETIQUETA = "font-sans text-sm text-texto-suave";
export const CAMPO =
  "mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario";
export const BOTON =
  "rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60";
export const BOTON_SECUNDARIO =
  "rounded-full border border-primario px-5 py-2 font-sans text-sm text-primario transition hover:bg-primario hover:text-fondo disabled:opacity-60";
export const TARJETA = "rounded-2xl border border-primario/15 bg-white/60 p-6";
export const AYUDA = "mt-1 font-sans text-xs text-texto-suave";
export const ENLACE = "font-sans text-sm text-primario hover:text-primario-oscuro";

/** Query de las pantallas del master: claves de mensajes.ts, nunca textos. */
export type ParamsMaster = { error?: string; ok?: string; aviso?: string };

export function Mensajes({ params }: { params: ParamsMaster }) {
  const error = mensajeError(params.error);
  const info = mensajeInfo(params.ok);
  const aviso = mensajeAviso(params.aviso);
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
      {aviso && (
        <p role="status" className="mb-6 rounded-lg bg-fondo-oscuro px-4 py-3 font-sans text-sm text-texto">
          {aviso}
        </p>
      )}
    </>
  );
}

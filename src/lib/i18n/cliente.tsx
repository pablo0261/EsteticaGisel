"use client";

import { createContext, useContext } from "react";
import { IDIOMA_POR_DEFECTO, traducir, traductor, type Idioma, type Textos } from "./textos";

const IdiomaContext = createContext<Idioma>(IDIOMA_POR_DEFECTO);

/** Lo pone el layout del sitio con el idioma del tenant. */
export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return <IdiomaContext value={idioma}>{children}</IdiomaContext>;
}

export function useIdioma(): Idioma {
  return useContext(IdiomaContext);
}

/** Para atributos, placeholders y labels en componentes de cliente: `t({ es, pt })`. */
export function useT(): (textos: Textos) => string {
  return traductor(useIdioma());
}

/** Texto en el idioma del sitio: `<T es="Volver" pt="Voltar" />`. */
export function T({ es, pt }: Textos) {
  return <>{traducir(useIdioma(), { es, pt })}</>;
}

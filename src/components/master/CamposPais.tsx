"use client";

import { useState } from "react";
import type { Idioma } from "@/lib/i18n/textos";
import { IDIOMAS, MONEDAS, NOMBRE_IDIOMA, NOMBRE_PAIS, PAISES, VALORES_POR_PAIS, ZONAS_HORARIAS } from "@/lib/master/pais";
import type { Moneda, Pais } from "@/lib/tenant/tipos";
import { CAMPO, ETIQUETA } from "./ui";

export type ValoresCamposPais = { pais: Pais; idioma: Idioma; zonaHoraria: string; moneda: Moneda };

/** País, idioma, zona horaria y moneda. Al cambiar el país se proponen sus valores (editables). */
export function CamposPais({ inicial }: { inicial: ValoresCamposPais }) {
  const [valores, setValores] = useState(inicial);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={ETIQUETA}>
        País
        <select
          name="pais"
          value={valores.pais}
          onChange={(e) => {
            const pais = e.target.value as Pais;
            setValores({ pais, ...VALORES_POR_PAIS[pais] });
          }}
          className={CAMPO}
        >
          {PAISES.map((p) => (
            <option key={p} value={p}>
              {NOMBRE_PAIS[p]}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Idioma del sitio
        <select
          name="idioma"
          value={valores.idioma}
          onChange={(e) => setValores({ ...valores, idioma: e.target.value as Idioma })}
          className={CAMPO}
        >
          {IDIOMAS.map((i) => (
            <option key={i} value={i}>
              {NOMBRE_IDIOMA[i]}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Zona horaria
        <select
          name="zona_horaria"
          value={valores.zonaHoraria}
          onChange={(e) => setValores({ ...valores, zonaHoraria: e.target.value })}
          className={CAMPO}
        >
          {ZONAS_HORARIAS[valores.pais].map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <label className={ETIQUETA}>
        Moneda
        <select
          name="moneda"
          value={valores.moneda}
          onChange={(e) => setValores({ ...valores, moneda: e.target.value as Moneda })}
          className={CAMPO}
        >
          {MONEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

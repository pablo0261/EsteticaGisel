"use client";

import { useState } from "react";
import { editarColores } from "@/lib/master/acciones";
import { mensajeAviso, mensajeError } from "@/lib/master/mensajes";
import { evaluarPaleta, normalizarHex } from "@/lib/tenant/contraste";
import { estiloMarca, type ColoresMarca } from "@/lib/tenant/estilo";
import { BOTON, CAMPO, ETIQUETA, TARJETA } from "./ui";

const CAMPOS: { clave: keyof ColoresMarca; nombre: string; etiqueta: string }[] = [
  { clave: "colorPrimario", nombre: "color_primario", etiqueta: "Primario (botones y destacados)" },
  { clave: "colorSecundario", nombre: "color_secundario", etiqueta: "Secundario (detalles)" },
  { clave: "colorFondo", nombre: "color_fondo", etiqueta: "Fondo (y texto de los botones)" },
  { clave: "colorTexto", nombre: "color_texto", etiqueta: "Texto" },
];

const formatoRatio = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * Los 4 colores de la marca con vista previa y contraste en vivo. Es una ayuda: la action
 * vuelve a validar todo en el servidor.
 */
export function EditorColores({ slug, inicial }: { slug: string; inicial: ColoresMarca }) {
  const [colores, setColores] = useState(inicial);
  const validos = CAMPOS.every((c) => normalizarHex(colores[c.clave]) !== null);
  const problemas = validos ? evaluarPaleta(colores) : [];
  const bloquea = !validos || problemas.some((p) => p.bloquea);

  return (
    <form id="form-colores" action={editarColores} className={`${TARJETA} flex flex-col gap-5`}>
      <input type="hidden" name="slug" value={slug} />
      <h2 className="font-serif text-2xl text-texto">Colores</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.clave} className={ETIQUETA}>
            {c.etiqueta}
            <span className="mt-1 flex items-center gap-2">
              <input
                type="color"
                aria-label={`${c.etiqueta} (selector)`}
                value={normalizarHex(colores[c.clave]) ?? "#000000"}
                onChange={(e) => setColores({ ...colores, [c.clave]: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border border-primario/20 bg-fondo"
              />
              <input
                name={c.nombre}
                value={colores[c.clave]}
                onChange={(e) => setColores({ ...colores, [c.clave]: e.target.value })}
                required
                maxLength={7}
                spellCheck={false}
                className={`${CAMPO} mt-0 font-mono`}
              />
            </span>
          </label>
        ))}
      </div>

      <div style={estiloMarca(colores)} className="rounded-2xl border border-primario/15 bg-fondo p-6">
        <p className="font-sans text-xs uppercase tracking-widest text-secundario">Vista previa</p>
        <p className="mt-2 font-serif text-3xl text-texto">
          Tu momento de <span className="text-primario">bienestar</span>
        </p>
        <p className="mt-2 font-sans text-sm text-texto-suave">Así se ve el texto del sitio sobre el fondo.</p>
        <span className="mt-4 inline-block rounded-full bg-primario px-6 py-2.5 font-sans text-sm font-medium text-fondo">
          Reservar turno
        </span>
      </div>

      {!validos && (
        <p role="alert" className="font-sans text-sm text-primario-oscuro">
          {mensajeError("color_invalido")}
        </p>
      )}
      {problemas.map((p) => (
        <p key={p.clave} role={p.bloquea ? "alert" : "status"} className="font-sans text-sm text-primario-oscuro">
          {p.bloquea ? mensajeError(p.clave) : mensajeAviso(p.clave)} (contraste {formatoRatio(p.ratio)}:1, mínimo{" "}
          {formatoRatio(p.minimo)}:1)
        </p>
      ))}

      <div>
        <button type="submit" disabled={bloquea} className={BOTON}>
          Guardar colores
        </button>
      </div>
    </form>
  );
}

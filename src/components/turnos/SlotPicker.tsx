"use client";

import { useEffect, useState } from "react";
import { consultarDisponibilidad } from "@/app/sitio/[tenant]/turnos/disponibilidad-action";
import { fechaHoy, sumarDias } from "@/lib/turnos/fechas";
import { LOCALES, type Idioma } from "@/lib/i18n/textos";
import { T, useIdioma } from "@/lib/i18n/cliente";
import type { SlotDisponible } from "@/lib/data/turnos";

/** Próximos días desde hoy en la zona del negocio, con su etiqueta en el idioma del sitio. */
function proximosDias(cantidad: number, zona: string, idioma: Idioma) {
  const hoy = fechaHoy(zona);
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = sumarDias(hoy, i);
    // Mediodía UTC de esa fecha, formateado en UTC: la etiqueta no depende del navegador.
    const etiqueta = new Date(`${fecha}T12:00:00Z`).toLocaleDateString(LOCALES[idioma], {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return { fecha, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) };
  });
}

export function SlotPicker({
  servicioIds,
  zonaHoraria,
  onSelect,
}: {
  servicioIds: string[];
  zonaHoraria: string;
  onSelect: (fecha: string, iso: string) => void;
}) {
  const idioma = useIdioma();
  const dias = proximosDias(14, zonaHoraria, idioma);
  const [fecha, setFecha] = useState(dias[0].fecha);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            onClick={() => setFecha(d.fecha)}
            className={`shrink-0 rounded-lg px-3 py-2 font-sans text-sm transition ${
              d.fecha === fecha
                ? "bg-primario text-fondo"
                : "bg-white/60 text-texto-suave hover:bg-fondo-oscuro"
            }`}
          >
            {d.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <SlotsDelDia
          key={`${servicioIds.join(",")}-${fecha}`}
          servicioIds={servicioIds}
          fecha={fecha}
          onSelect={(iso) => onSelect(fecha, iso)}
        />
      </div>
    </div>
  );
}

function SlotsDelDia({
  servicioIds,
  fecha,
  onSelect,
}: {
  servicioIds: string[];
  fecha: string;
  onSelect: (iso: string) => void;
}) {
  const [slots, setSlots] = useState<SlotDisponible[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    consultarDisponibilidad(servicioIds, fecha).then((resultado) => {
      if (activo) setSlots(resultado);
    });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioIds.join(","), fecha]);

  if (slots === null) {
    return (
      <p className="font-sans text-sm text-texto-suave">
        <T es="Buscando horarios…" pt="Buscando horários…" />
      </p>
    );
  }
  if (slots.length === 0) {
    return (
      <p className="font-sans text-sm text-texto-suave">
        <T
          es="No hay horarios disponibles este día. Probá otra fecha."
          pt="Não há horários disponíveis neste dia. Tente outra data."
        />
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => (
        <button
          key={s.iso}
          type="button"
          onClick={() => {
            setSeleccionado(s.iso);
            onSelect(s.iso);
          }}
          className={`rounded-lg border px-3 py-2 font-sans text-sm transition ${
            seleccionado === s.iso
              ? "border-primario bg-primario text-fondo"
              : "border-primario/20 bg-white/60 text-texto hover:border-primario/40"
          }`}
        >
          {s.hora}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { consultarDisponibilidad } from "@/app/sitio/[tenant]/turnos/disponibilidad-action";
import type { SlotDisponible } from "@/lib/data/turnos";

function proximosDias(cantidad: number): { fecha: string; etiqueta: string }[] {
  const dias = [];
  const hoy = new Date();
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const fecha = d.toISOString().slice(0, 10);
    const etiqueta = d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    dias.push({ fecha, etiqueta });
  }
  return dias;
}

export function SlotPicker({
  servicioIds,
  onSelect,
}: {
  servicioIds: string[];
  onSelect: (fecha: string, iso: string) => void;
}) {
  const dias = proximosDias(14);
  const [fecha, setFecha] = useState(dias[0].fecha);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            onClick={() => setFecha(d.fecha)}
            className={`shrink-0 rounded-lg px-3 py-2 font-sans text-sm capitalize transition ${
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
    return <p className="font-sans text-sm text-texto-suave">Buscando horarios…</p>;
  }
  if (slots.length === 0) {
    return (
      <p className="font-sans text-sm text-texto-suave">
        No hay horarios disponibles este día. Probá otra fecha.
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

"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { reservarTurno } from "@/app/turnos/actions";
import { formatPrecioARS } from "@/lib/format";
import { calcularMontoSena } from "@/lib/turnos/reglas";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import type { Servicio } from "@/lib/data/types";

export function ReservaForm({
  servicios,
  senaPorcentaje,
}: {
  servicios: Servicio[];
  senaPorcentaje: number;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    servicios[0] ? [servicios[0].id] : [],
  );
  const [fecha, setFecha] = useState("");
  const [iso, setIso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seleccionados = servicios.filter((s) => selectedIds.includes(s.id));
  const precioTotal = seleccionados.reduce((sum, s) => sum + s.precio, 0);
  const montoSena = calcularMontoSena(precioTotal, senaPorcentaje);

  function toggleServicio(id: string) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return servicios.filter((s) => set.has(s.id)).map((s) => s.id);
    });
    setIso("");
  }

  function onSubmit(formData: FormData) {
    setError(null);
    selectedIds.forEach((id) => formData.append("servicioIds", id));
    formData.set("fecha", fecha);
    formData.set("iso", iso);

    startTransition(async () => {
      const result = await reservarTurno(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-6">
      <div>
        <label className="font-sans text-sm font-medium text-ink">
          Elegí uno o más servicios
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {servicios.map((s) => {
            const activo = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleServicio(s.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition ${
                  activo
                    ? "border-mauve bg-mauve/10"
                    : "border-mauve/20 bg-white/60 hover:border-mauve/40"
                }`}
              >
                <span className="font-sans text-sm font-medium text-ink">{s.nombre}</span>
                <span className="mt-1 font-sans text-xs text-ink-soft">
                  {s.precio > 0 ? formatPrecioARS(s.precio) : "Consultar"}
                </span>
              </button>
            );
          })}
        </div>

        {selectedIds.length > 1 && (
          <p className="mt-3 rounded-lg bg-sage/10 px-3 py-2 font-sans text-sm text-sage">
            Elegiste más de un servicio: los horarios que se muestran abajo son
            los que tienen ambos turnos disponibles de forma consecutiva. Si
            preferís horarios separados, hacé una reserva por cada servicio.
          </p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div>
          <label className="font-sans text-sm font-medium text-ink">Elegí día y horario</label>
          <div className="mt-2">
            <SlotPicker
              servicioIds={selectedIds}
              onSelect={(f, i) => {
                setFecha(f);
                setIso(i);
              }}
            />
          </div>
        </div>
      )}

      {iso && (
        <div className="flex flex-col gap-4 rounded-2xl border border-mauve/15 bg-white/60 p-5">
          <p className="font-sans text-sm text-ink-soft">
            Reservás con una seña de {montoSena > 0 ? formatPrecioARS(montoSena) : ""}{" "}
            (se descuenta del precio total del servicio).
          </p>
          <label className="font-sans text-sm text-ink-soft">
            Nombre y apellido
            <input
              name="clienteNombre"
              required
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>
          <label className="font-sans text-sm text-ink-soft">
            Email
            <input
              name="clienteEmail"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>
          <label className="font-sans text-sm text-ink-soft">
            Teléfono
            <input
              name="clienteTelefono"
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-mauve px-7 py-3 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60"
          >
            Confirmar reserva
          </button>
        </div>
      )}
      <LoadingOverlay show={pending} label="Redirigiendo a Mercado Pago…" />
    </form>
  );
}

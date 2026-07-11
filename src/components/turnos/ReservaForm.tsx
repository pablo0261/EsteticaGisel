"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { reservarTurno } from "@/app/turnos/actions";
import { formatPrecioARS } from "@/lib/format";
import type { Servicio } from "@/lib/data/types";

export function ReservaForm({ servicios }: { servicios: Servicio[] }) {
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [iso, setIso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const servicio = servicios.find((s) => s.id === servicioId);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("servicioId", servicioId);
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
        <label className="font-sans text-sm font-medium text-ink">Servicio</label>
        <select
          value={servicioId}
          onChange={(e) => {
            setServicioId(e.target.value);
            setIso("");
          }}
          className="mt-2 w-full rounded-lg border border-mauve/20 bg-white px-3 py-2 text-ink"
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} {s.precio > 0 ? `— ${formatPrecioARS(s.precio)}` : ""}
            </option>
          ))}
        </select>
      </div>

      {servicioId && (
        <div>
          <label className="font-sans text-sm font-medium text-ink">Elegí día y horario</label>
          <div className="mt-2">
            <SlotPicker
              servicioId={servicioId}
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
            Reservás con una seña del {servicio?.precio ? formatPrecioARS(servicio.precio) : ""}{" "}
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
            Teléfono (opcional)
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
            {pending ? "Redirigiendo a Mercado Pago…" : "Reservar y pagar seña"}
          </button>
        </div>
      )}
    </form>
  );
}

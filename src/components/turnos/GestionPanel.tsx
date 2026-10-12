"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { cancelarTurno, reprogramarTurno } from "@/app/sitio/[tenant]/turnos/gestion/[token]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function GestionPanel({
  token,
  servicioId,
  permitido,
}: {
  token: string;
  servicioId: string;
  permitido: boolean;
}) {
  const [modo, setModo] = useState<"inicial" | "reprogramando" | "cancelado" | "reprogramado">(
    "inicial",
  );
  const [error, setError] = useState<string | null>(null);
  const [nuevoIso, setNuevoIso] = useState<{ fecha: string; iso: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!permitido) {
    return (
      <p className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
        Está fuera del plazo permitido para cancelar o reprogramar online. Por
        favor contactanos directamente.
      </p>
    );
  }

  if (modo === "cancelado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        Tu turno fue cancelado. La seña no es reembolsable.
      </p>
    );
  }

  if (modo === "reprogramado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        ¡Listo! Tu turno fue reprogramado.
      </p>
    );
  }

  function onCancelar() {
    setError(null);
    startTransition(async () => {
      const res = await cancelarTurno(token);
      if (res.ok) setModo("cancelado");
      else setError(res.error);
    });
  }

  function onConfirmarReprogramacion() {
    if (!nuevoIso) return;
    setError(null);
    startTransition(async () => {
      const res = await reprogramarTurno(token, nuevoIso.fecha, nuevoIso.iso);
      if (res.ok) setModo("reprogramado");
      else setError(res.error);
    });
  }

  if (modo === "reprogramando") {
    return (
      <div className="flex flex-col gap-4">
        <SlotPicker
          servicioIds={[servicioId]}
          onSelect={(fecha, iso) => setNuevoIso({ fecha, iso })}
        />
        {error && (
          <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!nuevoIso || pending}
            onClick={onConfirmarReprogramacion}
            className="rounded-full bg-primario px-6 py-2 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60"
          >
            Confirmar nuevo horario
          </button>
          <button
            type="button"
            onClick={() => setModo("inicial")}
            className="font-sans text-sm text-texto-suave hover:text-texto"
          >
            Volver
          </button>
        </div>
        <LoadingOverlay show={pending} label="Guardando cambios…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModo("reprogramando")}
          className="rounded-full border border-primario px-6 py-2 font-sans text-sm font-medium text-primario transition hover:bg-primario hover:text-fondo"
        >
          Reprogramar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancelar}
          className="rounded-full px-6 py-2 font-sans text-sm font-medium text-primario-oscuro underline-offset-4 hover:underline disabled:opacity-60"
        >
          Cancelar turno
        </button>
      </div>
      <LoadingOverlay show={pending} label="Cancelando…" />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { cancelarTurno, reprogramarTurno } from "@/app/turnos/gestion/[token]/actions";

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
      <p className="rounded-lg bg-mauve/10 px-4 py-3 font-sans text-sm text-mauve-dark">
        Está fuera del plazo permitido para cancelar o reprogramar online. Por
        favor contactá directamente a Gisel.
      </p>
    );
  }

  if (modo === "cancelado") {
    return (
      <p className="rounded-lg bg-sage/10 px-4 py-3 font-sans text-sm text-sage-dark">
        Tu turno fue cancelado. La seña no es reembolsable.
      </p>
    );
  }

  if (modo === "reprogramado") {
    return (
      <p className="rounded-lg bg-sage/10 px-4 py-3 font-sans text-sm text-sage-dark">
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
          servicioId={servicioId}
          onSelect={(fecha, iso) => setNuevoIso({ fecha, iso })}
        />
        {error && (
          <p className="rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!nuevoIso || pending}
            onClick={onConfirmarReprogramacion}
            className="rounded-full bg-mauve px-6 py-2 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Confirmar nuevo horario"}
          </button>
          <button
            type="button"
            onClick={() => setModo("inicial")}
            className="font-sans text-sm text-ink-soft hover:text-ink"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModo("reprogramando")}
          className="rounded-full border border-mauve px-6 py-2 font-sans text-sm font-medium text-mauve transition hover:bg-mauve hover:text-cream"
        >
          Reprogramar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancelar}
          className="rounded-full px-6 py-2 font-sans text-sm font-medium text-mauve-dark underline-offset-4 hover:underline disabled:opacity-60"
        >
          Cancelar turno
        </button>
      </div>
    </div>
  );
}

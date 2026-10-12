"use client";

import { useState, useTransition } from "react";
import { SlotPicker } from "./SlotPicker";
import { cancelarTurno, reprogramarTurno } from "@/app/sitio/[tenant]/turnos/gestion/[token]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useT } from "@/lib/i18n/cliente";

export function GestionPanel({
  token,
  servicioId,
  permitido,
  zonaHoraria,
}: {
  token: string;
  servicioId: string;
  permitido: boolean;
  zonaHoraria: string;
}) {
  const t = useT();
  const [modo, setModo] = useState<"inicial" | "reprogramando" | "cancelado" | "reprogramado">(
    "inicial",
  );
  const [error, setError] = useState<string | null>(null);
  const [nuevoIso, setNuevoIso] = useState<{ fecha: string; iso: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!permitido) {
    return (
      <p className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
        <T
          es="Está fuera del plazo permitido para cancelar o reprogramar online. Por favor contactanos directamente."
          pt="Está fora do prazo permitido para cancelar ou reagendar online. Por favor, entre em contato diretamente."
        />
      </p>
    );
  }

  if (modo === "cancelado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        <T
          es="Tu turno fue cancelado. La seña no es reembolsable."
          pt="Seu agendamento foi cancelado. O sinal não é reembolsável."
        />
      </p>
    );
  }

  if (modo === "reprogramado") {
    return (
      <p className="rounded-lg bg-secundario/10 px-4 py-3 font-sans text-sm text-secundario-oscuro">
        <T es="¡Listo! Tu turno fue reprogramado." pt="Pronto! Seu agendamento foi reagendado." />
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
          zonaHoraria={zonaHoraria}
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
            <T es="Confirmar nuevo horario" pt="Confirmar novo horário" />
          </button>
          <button
            type="button"
            onClick={() => setModo("inicial")}
            className="font-sans text-sm text-texto-suave hover:text-texto"
          >
            <T es="Volver" pt="Voltar" />
          </button>
        </div>
        <LoadingOverlay
          show={pending}
          label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })}
        />
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
          <T es="Reprogramar" pt="Reagendar" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancelar}
          className="rounded-full px-6 py-2 font-sans text-sm font-medium text-primario-oscuro underline-offset-4 hover:underline disabled:opacity-60"
        >
          <T es="Cancelar turno" pt="Cancelar agendamento" />
        </button>
      </div>
      <LoadingOverlay show={pending} label={t({ es: "Cancelando…", pt: "Cancelando…" })} />
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">Ups</p>
      <h1 className="font-serif text-3xl text-texto">Algo no funcionó</h1>
      <p className="max-w-md font-sans text-texto-suave">{error.message}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
        >
          Volver a intentar
        </button>
        <Button href="/admin" variant="outline">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}

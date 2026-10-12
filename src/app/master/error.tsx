"use client";

import { Button } from "@/components/ui/Button";

/** Error inesperado en el panel master. No muestra el mensaje del error (puede ser interno). */
export default function MasterError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <h1 className="font-serif text-3xl text-texto">Algo no funcionó</h1>
      <p className="max-w-md font-sans text-texto-suave">No pudimos cargar esta pantalla. Probá de nuevo en unos minutos.</p>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
        >
          Volver a intentar
        </button>
        <Button href="/" variant="outline">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

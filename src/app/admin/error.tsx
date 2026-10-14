"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/cliente";

/**
 * Error inesperado en el panel. No muestra error.message: en producción Next lo reemplaza por
 * un texto genérico, y en desarrollo el detalle está en la consola. El digest sirve para
 * buscarlo en el log del servidor.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6 text-center">
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "Ups", pt: "Ops" })}</p>
      <h1 className="font-serif text-3xl text-texto">{t({ es: "Algo no funcionó", pt: "Algo deu errado" })}</h1>
      <p className="max-w-md font-sans text-texto-suave">
        {t({
          es: "No pudimos completar lo que pediste. Probá de nuevo en unos segundos.",
          pt: "Não conseguimos concluir o que você pediu. Tente novamente em alguns segundos.",
        })}
      </p>
      {error.digest && <p className="font-mono text-xs text-texto-suave">{error.digest}</p>}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro"
        >
          {t({ es: "Volver a intentar", pt: "Tentar novamente" })}
        </button>
        <Button href="/admin" variant="outline">
          {t({ es: "Volver al panel", pt: "Voltar ao painel" })}
        </Button>
      </div>
    </div>
  );
}

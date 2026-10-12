"use client";

import { useState, useTransition } from "react";
import { comprarCurso } from "@/app/sitio/[tenant]/cursos/[id]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { T, useT } from "@/lib/i18n/cliente";

export function CompraForm({ cursoId }: { cursoId: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("cursoId", cursoId);
    startTransition(async () => {
      const result = await comprarCurso(formData);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
      <label className="flex-1 font-sans text-sm text-texto-suave">
        <T
          es="Tu email (ahí te va a llegar el acceso)"
          pt="Seu e-mail (o acesso será enviado para ele)"
        />
        <input
          name="clienteEmail"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-primario/20 bg-white px-3 py-2 text-texto"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60 sm:mt-0 sm:self-end"
      >
        <T es="Comprar" pt="Comprar" />
      </button>
      {error && (
        <p className="w-full rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
          {error}
        </p>
      )}
      <LoadingOverlay
        show={pending}
        label={t({ es: "Redirigiendo a Mercado Pago…", pt: "Redirecionando para o Mercado Pago…" })}
      />
    </form>
  );
}

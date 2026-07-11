"use client";

import { useState, useTransition } from "react";
import { comprarCurso } from "@/app/cursos/[id]/actions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function CompraForm({ cursoId }: { cursoId: string }) {
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
      <label className="flex-1 font-sans text-sm text-ink-soft">
        Tu email (ahí te va a llegar el acceso)
        <input
          name="clienteEmail"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-mauve/20 bg-white px-3 py-2 text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-full bg-mauve px-7 py-3 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60 sm:mt-0 sm:self-end"
      >
        Comprar
      </button>
      {error && (
        <p className="w-full rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
          {error}
        </p>
      )}
      <LoadingOverlay show={pending} label="Redirigiendo a Mercado Pago…" />
    </form>
  );
}

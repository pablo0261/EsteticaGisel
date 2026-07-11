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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Ups</p>
      <h1 className="font-serif text-3xl text-ink">Algo no funcionó</h1>
      <p className="max-w-md font-sans text-ink-soft">{error.message}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-mauve px-7 py-3 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark"
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

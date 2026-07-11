"use client";

import { useFormStatus } from "react-dom";

/** Botón de submit que se deshabilita mientras el <form> que lo contiene está enviándose. */
export function SubmitButton({
  children,
  className,
  formAction,
}: {
  children: React.ReactNode;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending} className={className}>
      {children}
    </button>
  );
}

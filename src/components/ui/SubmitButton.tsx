"use client";

import { useFormStatus } from "react-dom";

/** Botón de submit que se deshabilita mientras el <form> que lo contiene está enviándose (o si disabled). */
export function SubmitButton({
  children,
  className,
  formAction,
  disabled = false,
}: {
  children: React.ReactNode;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending || disabled} className={className}>
      {children}
    </button>
  );
}

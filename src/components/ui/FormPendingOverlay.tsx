"use client";

import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "./LoadingOverlay";

/** Colocar una vez dentro de cada <form>: muestra el overlay mientras esa acción está en curso. */
export function FormPendingOverlay({ label }: { label?: string }) {
  const { pending } = useFormStatus();
  return <LoadingOverlay show={pending} label={label} />;
}

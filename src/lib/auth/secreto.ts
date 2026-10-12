import "server-only";
import { secretoMfaValido } from "./cookie-mfa";

/** MFA_SECRET del entorno. Sin él no se puede ni crear un código ni marcar una sesión: lanza. */
export function secretoMfa(): string {
  const secreto = process.env.MFA_SECRET;
  if (!secretoMfaValido(secreto)) {
    throw new Error("Falta MFA_SECRET en el entorno (32 bytes aleatorios en base64url).");
  }
  return secreto;
}

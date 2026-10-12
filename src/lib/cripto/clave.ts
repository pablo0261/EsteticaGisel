import "server-only";
import { claveDesdeTexto } from "./credenciales";

/** CREDENCIALES_KEY del entorno (32 bytes). Lanza si falta o es inválida. */
export function claveCredenciales(): Buffer {
  return claveDesdeTexto(process.env.CREDENCIALES_KEY);
}

/** Para avisar en el panel antes de intentar guardar credenciales. */
export function claveCredencialesConfigurada(): boolean {
  try {
    claveCredenciales();
    return true;
  } catch {
    return false;
  }
}

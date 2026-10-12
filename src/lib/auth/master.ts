import "server-only";
import { cache } from "react";
import { perfilDe } from "./servicio";
import { sesionActual } from "./sesion";

/**
 * Master con la verificación en dos pasos completa. Lanza si no. sesionActual() valida la
 * sesión contra Supabase (getUser) y la cookie mfa; además el perfil tiene que ser master.
 * Se repite en el servidor por el mismo motivo que tenantDelAdmin: una action se puede
 * invocar desde cualquier ruta. Cada página y action del master lo llama.
 */
export const masterVerificado = cache(async (): Promise<{ userId: string }> => {
  const sesion = await sesionActual();
  if (!sesion?.verificada) throw new Error("No autorizado");
  const perfil = await perfilDe(sesion.userId);
  if (perfil?.rol !== "master") throw new Error("No autorizado");
  return { userId: sesion.userId };
});

/** Para páginas y layouts del master: sin acceso, el layout ya muestra el aviso (no se lanza). */
export async function esMasterVerificado(): Promise<boolean> {
  return masterVerificado().then(
    () => true,
    () => false,
  );
}

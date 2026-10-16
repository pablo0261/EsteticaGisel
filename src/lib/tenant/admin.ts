import "server-only";
import { cache } from "react";
import { perfilDe } from "@/lib/auth/servicio";
import { sesionActual } from "@/lib/auth/sesion";
import { tenantDelHost, tenantDelRequest } from "./actual";
import { perfilAutorizado } from "./permisos";
import type { Tenant } from "./tipos";

/**
 * Tenant del panel: exige sesión con la verificación en dos pasos completa y un perfil
 * autorizado para el tenant del host (el cliente solo administra el suyo; el master,
 * cualquiera). Lanza si no.
 * La verificación se repite acá, y no queda solo en el proxy, porque una server action
 * del panel se puede invocar con un POST a cualquier ruta, incluso a una del sitio
 * público, que el proxy no protege.
 * Con cache(): layout y página comparten una sola evaluación por request.
 */
export const tenantDelAdmin = cache(async (): Promise<Tenant> => {
  const tenant = await tenantDelRequest();
  if (!tenant) throw new Error("No autorizado");

  const sesion = await sesionActual();
  if (!sesion?.verificada) throw new Error("No autorizado");

  if (!perfilAutorizado(await perfilDe(sesion.userId), tenant.id)) throw new Error("No autorizado");
  return tenant;
});

/**
 * Para las páginas del panel: null si el tenant del host está suspendido. El layout ya
 * muestra el aviso de suspendido y no muestra la página, pero Next la evalúa igual (en
 * paralelo con el layout): sin esto, tenantDelAdmin lanzaría "No autorizado" y llenaría el
 * log de errores. En cualquier otro caso, tenantDelAdmin (lanza si no hay acceso).
 * Las server actions siguen usando tenantDelAdmin: con el tenant suspendido, fallan cerradas.
 */
export async function tenantDelPanel(): Promise<Tenant | null> {
  const tenant = await tenantDelHost();
  if (tenant?.estado === "suspendido") return null;
  return tenantDelAdmin();
}

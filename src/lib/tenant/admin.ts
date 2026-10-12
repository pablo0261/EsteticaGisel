import "server-only";
import { cache } from "react";
import { perfilDe } from "@/lib/auth/servicio";
import { sesionActual } from "@/lib/auth/sesion";
import { tenantDelRequest } from "./actual";
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

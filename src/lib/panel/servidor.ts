import "server-only";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { tenantDelAdmin, tenantDelPanel } from "@/lib/tenant/admin";
import type { Tenant } from "@/lib/tenant/tipos";
import type { ClaveError, ClaveInfo } from "./mensajes";
import { seccionHabilitada, type SeccionPanel } from "./secciones";

/*
 * Chequeos del panel del cliente en el servidor. El menú solo muestra las secciones de los
 * módulos habilitados, pero una página o una action se pueden pedir directo: cada una vuelve
 * a verificar la sesión (tenantDelAdmin) y el módulo de su sección.
 */

/**
 * Para páginas: 404 si el módulo de la sección está apagado. null si el cliente está
 * suspendido (ver tenantDelPanel): la página no muestra nada.
 */
export async function tenantDeSeccion(seccion: SeccionPanel): Promise<Tenant | null> {
  const tenant = await tenantDelPanel();
  if (!tenant) return null;
  if (!seccionHabilitada(tenant.modulos, seccion)) notFound();
  return tenant;
}

/** Para server actions: con el módulo apagado vuelve al inicio del panel con el aviso, sin leer el formulario. */
export async function tenantDeAccion(seccion: SeccionPanel): Promise<Tenant> {
  const tenant = await tenantDelAdmin();
  if (!seccionHabilitada(tenant.modulos, seccion)) redirect("/admin?error=modulo_inactivo");
  return tenant;
}

export type MensajePanel = { error: ClaveError } | { ok: ClaveInfo };

/** Redirige a una ruta del panel con una clave de mensajes.ts (nunca un texto). */
export function ir(ruta: string, mensaje?: MensajePanel): never {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(mensaje ?? {})) params.set(clave, valor);
  const query = params.toString();
  redirect(query ? `${ruta}?${query}` : ruta);
}

/** Después de un cambio que se ve en el sitio público: la página del panel y el sitio. */
export function revalidarSitio(rutaPanel: string): void {
  revalidatePath(rutaPanel);
  revalidatePath("/sitio/[tenant]", "layout");
}

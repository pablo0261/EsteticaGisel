"use server";

import { columnasConfiguracion, parsearConfiguracion } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/configuracion";

/**
 * Horario de atención y, con el módulo turnos, las reglas de los turnos y el modo de pago.
 * Sin el módulo, las reglas no se leen ni se tocan (parsearConfiguracion devuelve reglas null).
 */
export async function guardarConfiguracion(formData: FormData) {
  const tenant = await tenantDeAccion("configuracion");
  const config = parsearConfiguracion(formData, tenant.modulos.turnos);
  if (!config.ok) ir(RUTA, { error: config.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("configuracion_negocio", columnasConfiguracion(config.valor))
    .select("tenant_id");
  if (error || !data?.length) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

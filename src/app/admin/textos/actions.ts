"use server";

import { columnasTextosSitio, parsearTextosSitio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/textos";

/**
 * Textos de inicio y, con su módulo, los de "sobre mí". Lista blanca: columnasTextosSitio
 * solo nombra esas columnas de tenant_marca (colores, imágenes y contacto son del master).
 */
export async function guardarTextosSitio(formData: FormData) {
  const tenant = await tenantDeAccion("textos");
  const textos = parsearTextosSitio(formData, tenant.modulos.sobreMi);
  if (!textos.ok) ir(RUTA, { error: textos.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("tenant_marca", columnasTextosSitio(textos.valor))
    .select("tenant_id");
  if (error || !data?.length) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

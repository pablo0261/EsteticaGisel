"use server";

import { columnasTestimonio, parsearId, parsearTestimonio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/testimonios";

export async function crearTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const testimonio = parsearTestimonio(formData);
  if (!testimonio.ok) ir(RUTA, { error: testimonio.error });
  const { error } = await datosDelTenant(tenant.id).insert("testimonios", columnasTestimonio(testimonio.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const testimonio = parsearTestimonio(formData);
  if (!testimonio.ok) ir(RUTA, { error: testimonio.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("testimonios", columnasTestimonio(testimonio.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarTestimonio(formData: FormData) {
  const tenant = await tenantDeAccion("testimonios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("testimonios").eq("id", id).select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}

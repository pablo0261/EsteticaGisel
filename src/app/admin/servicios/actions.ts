"use server";

import { columnasServicio, esReferenciaEnUso, parsearId, parsearServicio } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

/*
 * Servicios del cliente. Cada action verifica sesión y sección antes de leer el formulario,
 * valida con lista blanca (parsearServicio) y redirige con una clave de mensajes.ts. Editar
 * y borrar filtran por tenant e id: un id de otro cliente no afecta ninguna fila (?error=id).
 */
const RUTA = "/admin/servicios";

export async function crearServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const servicio = parsearServicio(formData);
  if (!servicio.ok) ir(RUTA, { error: servicio.error });
  const { error } = await datosDelTenant(tenant.id).insert("servicios", columnasServicio(servicio.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const servicio = parsearServicio(formData);
  if (!servicio.ok) ir(RUTA, { error: servicio.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("servicios", columnasServicio(servicio.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarServicio(formData: FormData) {
  const tenant = await tenantDeAccion("servicios");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("servicios").eq("id", id).select("id");
  // Los turnos referencian el servicio (FK sin cascada): un servicio con turnos no se borra.
  if (esReferenciaEnUso(error)) ir(RUTA, { error: "servicio_con_turnos" });
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}

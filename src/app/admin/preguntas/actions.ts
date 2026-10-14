"use server";

import { columnasPregunta, parsearId, parsearPregunta } from "@/lib/panel/formularios";
import { ir, revalidarSitio, tenantDeAccion } from "@/lib/panel/servidor";
import { datosDelTenant } from "@/lib/tenant/datos";

const RUTA = "/admin/preguntas";

export async function crearPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const pregunta = parsearPregunta(formData);
  if (!pregunta.ok) ir(RUTA, { error: pregunta.error });
  const { error } = await datosDelTenant(tenant.id).insert("preguntas_frecuentes", columnasPregunta(pregunta.valor));
  if (error) ir(RUTA, { error: "error" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "creado" });
}

export async function editarPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const pregunta = parsearPregunta(formData);
  if (!pregunta.ok) ir(RUTA, { error: pregunta.error });
  const { data, error } = await datosDelTenant(tenant.id)
    .update("preguntas_frecuentes", columnasPregunta(pregunta.valor))
    .eq("id", id)
    .select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "guardado" });
}

export async function eliminarPregunta(formData: FormData) {
  const tenant = await tenantDeAccion("preguntas");
  const id = parsearId(formData);
  if (!id) ir(RUTA, { error: "id" });
  const { data, error } = await datosDelTenant(tenant.id).delete("preguntas_frecuentes").eq("id", id).select("id");
  if (error) ir(RUTA, { error: "error" });
  if (!data?.length) ir(RUTA, { error: "id" });
  revalidarSitio(RUTA);
  ir(RUTA, { ok: "eliminado" });
}

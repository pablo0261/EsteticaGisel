"use server";

import { revalidatePath } from "next/cache";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

function revalidar() {
  revalidatePath("/admin/servicios");
  revalidatePath("/sitio/[tenant]", "layout");
}

export async function createServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).insert("servicios", {
    nombre: String(formData.get("nombre")),
    duracion_minutos: Number(formData.get("duracion_minutos")),
    precio: Number(formData.get("precio") || 0),
    orden: Number(formData.get("orden") || 0),
  });
  revalidar();
}

export async function updateServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id)
    .update("servicios", {
      nombre: String(formData.get("nombre")),
      duracion_minutos: Number(formData.get("duracion_minutos")),
      precio: Number(formData.get("precio") || 0),
      orden: Number(formData.get("orden") || 0),
      activo: formData.get("activo") === "on",
    })
    .eq("id", String(formData.get("id")));
  revalidar();
}

export async function deleteServicio(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).delete("servicios").eq("id", String(formData.get("id")));
  revalidar();
}

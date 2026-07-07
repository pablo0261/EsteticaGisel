"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
}

function revalidar() {
  revalidatePath("/admin/servicios");
  revalidatePath("/");
}

export async function createServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("servicios").insert({
    nombre: String(formData.get("nombre")),
    duracion_minutos: Number(formData.get("duracion_minutos")),
    precio: Number(formData.get("precio") || 0),
    orden: Number(formData.get("orden") || 0),
  });
  revalidar();
}

export async function updateServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  await db
    .from("servicios")
    .update({
      nombre: String(formData.get("nombre")),
      duracion_minutos: Number(formData.get("duracion_minutos")),
      precio: Number(formData.get("precio") || 0),
      orden: Number(formData.get("orden") || 0),
      activo: formData.get("activo") === "on",
    })
    .eq("id", id);
  revalidar();
}

export async function deleteServicio(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("servicios").delete().eq("id", String(formData.get("id")));
  revalidar();
}

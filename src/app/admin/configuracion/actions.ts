"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateConfiguracion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const db = createAdminClient();
  await db
    .from("configuracion_negocio")
    .update({
      horas_minimas_cancelacion: Number(
        formData.get("horas_minimas_cancelacion"),
      ),
      horas_anticipacion_recordatorio: Number(
        formData.get("horas_anticipacion_recordatorio"),
      ),
      minutos_preparacion_entre_turnos: Number(
        formData.get("minutos_preparacion_entre_turnos"),
      ),
      sena_porcentaje: Number(formData.get("sena_porcentaje")),
    })
    .eq("id", 1);
  revalidatePath("/admin/configuracion");
}

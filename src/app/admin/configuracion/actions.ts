"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { construirHorarioAtencion, DIAS_SEMANA } from "@/lib/turnos/horario";

export async function updateConfiguracion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const horarioAtencion = construirHorarioAtencion(
    DIAS_SEMANA.map((d) => ({
      key: d.key,
      cerrado: formData.get(`cerrado_${d.key}`) === "on",
      desde: String(formData.get(`desde_${d.key}`) || ""),
      hasta: String(formData.get(`hasta_${d.key}`) || ""),
    })),
  );

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
      horario_atencion: horarioAtencion,
    })
    .eq("id", 1);
  revalidatePath("/admin/configuracion");
}

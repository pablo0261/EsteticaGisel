"use server";

import { revalidatePath } from "next/cache";
import { construirHorarioAtencion, DIAS_SEMANA } from "@/lib/turnos/horario";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";

export async function updateConfiguracion(formData: FormData) {
  const tenant = await tenantDelAdmin();

  const horarioAtencion = construirHorarioAtencion(
    DIAS_SEMANA.map((d) => ({
      key: d.key,
      cerrado: formData.get(`cerrado_${d.key}`) === "on",
      desde: String(formData.get(`desde_${d.key}`) || ""),
      hasta: String(formData.get(`hasta_${d.key}`) || ""),
    })),
  );

  await datosDelTenant(tenant.id).update("configuracion_negocio", {
    horas_minimas_cancelacion: Number(formData.get("horas_minimas_cancelacion")),
    minutos_preparacion_entre_turnos: Number(formData.get("minutos_preparacion_entre_turnos")),
    sena_porcentaje: Number(formData.get("sena_porcentaje")),
    horario_atencion: horarioAtencion,
  });
  revalidatePath("/admin/configuracion");
  revalidatePath("/sitio/[tenant]", "layout");
}

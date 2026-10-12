import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function autorizado(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Libera turnos pendiente_pago cuyo bloqueo de 15 min ya venció.
 * Es un job de sistema sobre todos los tenants: la excepción explícita a
 * "todo acceso pasa por datosDelTenant".
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("turnos")
    .delete()
    .eq("estado", "pendiente_pago")
    .lt("bloqueado_hasta", new Date().toISOString())
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ liberados: data?.length ?? 0 });
}

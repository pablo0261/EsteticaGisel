import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultasDelTenant } from "./consultas";

/** Acceso del servidor a las tablas de negocio de un tenant (ver consultasDelTenant). */
export function datosDelTenant(tenantId: string) {
  return consultasDelTenant(createAdminClient(), tenantId);
}

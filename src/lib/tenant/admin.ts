import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantDelRequest } from "./actual";
import { perfilAutorizado, type Perfil } from "./permisos";
import type { Tenant } from "./tipos";

/**
 * Tenant del panel: exige sesión y un perfil autorizado para el tenant del host
 * (el cliente solo administra el suyo; el master, cualquiera). Lanza si no.
 * Con cache(): layout y página comparten una sola evaluación por request.
 */
export const tenantDelAdmin = cache(async (): Promise<Tenant> => {
  const tenant = await tenantDelRequest();
  if (!tenant) throw new Error("No autorizado");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: perfil } = await createAdminClient()
    .from("perfiles")
    .select("rol, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!perfilAutorizado(perfil as Perfil | null, tenant.id)) throw new Error("No autorizado");

  return tenant;
});

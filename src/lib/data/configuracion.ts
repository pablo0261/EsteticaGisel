import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfiguracionNegocio } from "./types";

export async function getConfiguracion(): Promise<ConfiguracionNegocio | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("configuracion_negocio")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return null;
  return data as ConfiguracionNegocio;
}

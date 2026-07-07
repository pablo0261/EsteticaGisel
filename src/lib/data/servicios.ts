import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Servicio } from "./types";

/** Públicos: solo activos (respeta RLS). Devuelve [] si la DB no está lista. */
export async function getServiciosPublicos(): Promise<Servicio[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("orden");
    if (error) return [];
    return (data as Servicio[]) ?? [];
  } catch {
    return [];
  }
}

/** Admin: todos los servicios (service-role, ve inactivos). */
export async function getServiciosAdmin(): Promise<Servicio[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("servicios")
    .select("*")
    .order("orden");
  if (error) throw new Error(error.message);
  return (data as Servicio[]) ?? [];
}

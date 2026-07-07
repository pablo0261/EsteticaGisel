import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con la secret key (service-role): SOLO en el servidor.
 * Bypassa RLS — usar únicamente en backend (webhooks, cron, admin).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

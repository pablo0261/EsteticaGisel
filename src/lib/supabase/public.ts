import { createClient } from "@supabase/supabase-js";

/** Cliente anónimo para lecturas públicas server-side (respeta RLS). */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}

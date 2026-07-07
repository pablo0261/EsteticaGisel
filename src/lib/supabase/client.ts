import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para el navegador (usa la publishable key, segura en el cliente). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

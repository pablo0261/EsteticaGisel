import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_MFA, verificarMfa } from "./cookie-mfa";

export type Sesion = {
  userId: string;
  /** session_id del JWT de Supabase: la cookie mfa está atada a él. */
  sessionId: string;
  email: string | null;
  /** true si la cookie mfa corresponde a esta sesión (pasó el segundo factor). */
  verificada: boolean;
};

/**
 * Sesión del request, cacheada por request. Usa getClaims(): valida la firma del JWT (con
 * claves asimétricas, sin ir a Supabase) y da el session_id. El proxy además valida la
 * sesión contra Supabase con getUser() en cada request a /admin y a app.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const mfa = (await cookies()).get(COOKIE_MFA)?.value;
  return {
    userId: claims.sub,
    sessionId: claims.session_id,
    email: claims.email ?? null,
    verificada: verificarMfa(process.env.MFA_SECRET, mfa, claims.sub, claims.session_id),
  };
});

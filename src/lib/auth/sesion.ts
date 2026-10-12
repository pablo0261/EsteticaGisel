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
 * Sesión del request, cacheada por request (una sola ida a Supabase).
 * getClaims() valida la firma del JWT localmente y da el session_id, pero no detecta una
 * sesión cerrada o revocada (el token sigue firmado hasta que vence). Por eso además se
 * valida con getUser() contra Supabase: si la sesión ya no existe, no hay sesión. Así lo
 * que se decide en el servidor (server actions, tenantDelAdmin) no depende solo del proxy.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const { data: datosUsuario, error } = await supabase.auth.getUser();
  if (error || datosUsuario.user?.id !== claims.sub) return null;
  const mfa = (await cookies()).get(COOKIE_MFA)?.value;
  return {
    userId: claims.sub,
    sessionId: claims.session_id,
    email: claims.email ?? null,
    verificada: verificarMfa(process.env.MFA_SECRET, mfa, claims.sub, claims.session_id),
  };
});

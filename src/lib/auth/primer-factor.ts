/**
 * ¿La sesión de Supabase se inició con contraseña? Solo esa cuenta como primer factor.
 * Con la clave publicable cualquiera puede pedir un magic link u OTP (signInWithOtp) y
 * obtener una sesión válida sin la contraseña: Supabase la marca en el claim amr como
 * "otp". La recuperación de contraseña también da "otp", pero ese flujo cierra todas las
 * sesiones y el usuario vuelve a entrar con la contraseña nueva. Puro: lo usa el proxy.
 */
export function sesionConPassword(claims: { amr?: unknown } | null | undefined): boolean {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some(
    (entrada) =>
      entrada === "password" ||
      (typeof entrada === "object" && entrada !== null && (entrada as { method?: unknown }).method === "password"),
  );
}

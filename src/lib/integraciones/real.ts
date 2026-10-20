/** Placeholders del .env.example: no cuentan como credencial cargada. */
const PLACEHOLDERS = new Set([
  "xxx",
  "test-xxx",
  "xxx.apps.googleusercontent.com",
  "cambiar-por-un-valor-largo-y-aleatorio",
]);

/**
 * ¿Hay un secreto de verdad, o sigue el valor de ejemplo? Un access token de prueba
 * de Mercado Pago (TEST-…) sí cuenta: el placeholder es exactamente TEST-xxx.
 */
export function esCredencialUsable(valor: string | null | undefined): valor is string {
  const v = valor?.trim() ?? "";
  if (v.length < 8) return false;
  const bajo = v.toLowerCase();
  if (PLACEHOLDERS.has(bajo) || bajo.startsWith("test-xxx") || bajo.startsWith("xxx.")) return false;
  return true;
}

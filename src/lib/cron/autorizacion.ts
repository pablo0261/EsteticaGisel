import { timingSafeEqual } from "node:crypto";

/**
 * ¿El request del cron trae "Bearer <CRON_SECRET>"? Sin CRON_SECRET configurado (vacío o
 * sin definir) nadie pasa: si no, "Bearer " o "Bearer undefined" abrirían los endpoints.
 * La comparación es en tiempo constante para no filtrar el secreto por la duración.
 */
export function cronAutorizado(authorization: string | null, secreto: string | undefined): boolean {
  if (!secreto?.trim() || authorization == null) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(authorization);
  if (esperado.length !== recibido.length) return false;
  return timingSafeEqual(esperado, recibido);
}

/**
 * ¿El request del cron trae "Bearer <CRON_SECRET>"? Sin CRON_SECRET configurado (vacío o
 * sin definir) nadie pasa: si no, "Bearer " o "Bearer undefined" abrirían los endpoints.
 */
export function cronAutorizado(authorization: string | null, secreto: string | undefined): boolean {
  if (!secreto?.trim()) return false;
  return authorization === `Bearer ${secreto}`;
}

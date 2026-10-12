/**
 * Hasta la etapa D cada tenant no tiene credenciales propias de Mercado Pago ni
 * de Google Calendar: las del .env pertenecen a un único tenant, así que los
 * demás no deben crear pagos ni eventos de calendario con ellas.
 */
export function usaCredencialesGlobales(slug: string): boolean {
  return slug === (process.env.TENANT_CREDENCIALES_GLOBALES || "gisel");
}

/**
 * Formatea un monto en pesos argentinos: "$ 15.000".
 * Sin decimales (redondea), separador de miles con punto (es-AR).
 */
export function formatPrecioARS(monto: number): string {
  const n = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    monto,
  );
  return `$ ${n}`;
}

/** Formatea una duración en minutos: "1h 30min", "1h", "40min". */
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

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

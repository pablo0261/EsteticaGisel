import { fechaEnZona, isoFechaHora, minutosDelDia } from "@/lib/turnos/fechas";

/** Precio a cobrar: el de oferta si está activa y dentro de su ventana de fechas. */
export function precioEfectivo(opts: {
  precio: number;
  precioOferta: number | null;
  ofertaActiva: boolean;
  ofertaDesde: string | null;
  ofertaHasta: string | null;
  ahoraIso: string;
}): number {
  if (!opts.ofertaActiva || opts.precioOferta == null) return opts.precio;

  const ahora = new Date(opts.ahoraIso).getTime();
  if (opts.ofertaDesde && ahora < new Date(opts.ofertaDesde).getTime()) return opts.precio;
  if (opts.ofertaHasta && ahora > new Date(opts.ofertaHasta).getTime()) return opts.precio;

  return opts.precioOferta;
}

/** Fecha de expiración = fecha de compra + días de acceso, expresada en la zona del negocio. */
export function calcularExpiracion(
  fechaCompraIso: string,
  diasAcceso: number,
  zona: string,
): string {
  const vence = new Date(new Date(fechaCompraIso).getTime() + diasAcceso * 24 * 60 * 60 * 1000);
  return isoFechaHora(fechaEnZona(vence, zona), minutosDelDia(vence.toISOString(), zona), zona);
}

/** ¿El acceso sigue vigente? */
export function accesoVigente(expiraEnIso: string, ahoraIso: string): boolean {
  return new Date(expiraEnIso).getTime() > new Date(ahoraIso).getTime();
}

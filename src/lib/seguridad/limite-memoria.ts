/**
 * Límite en memoria por clave, para endpoints sensibles que no tienen una tabla
 * propia (webhook de Mercado Pago, compra de curso, OAuth). El proceso es uno
 * (servidor Node de larga duración): no reemplaza un límite en la base cuando
 * hay varias instancias, y se suma a la firma del webhook y a los límites de
 * login, recuperación y reservas.
 */
type Ventana = { inicio: number; cuenta: number };

const ventanas = new Map<string, Ventana>();

export function reiniciarLimites(): void {
  ventanas.clear();
}

function podar(ahora: number, ventanaMs: number): void {
  for (const [clave, ventana] of ventanas) {
    if (ahora - ventana.inicio >= ventanaMs) ventanas.delete(clave);
  }
}

/** true si este intento entra en el cupo de la ventana. */
export function consumoPermitido(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
  if (maximo < 1 || ventanaMs < 1) return false;
  const actual = ventanas.get(clave);
  if (!actual || ahora - actual.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, cuenta: 1 });
    if (ventanas.size > 5000) podar(ahora, ventanaMs);
    return true;
  }
  if (actual.cuenta >= maximo) return false;
  actual.cuenta += 1;
  return true;
}

/**
 * Con IP conocida, el cupo es por IP. Sin IP no se junta a todos los clientes
 * reales en el mismo balde de "por IP": se usa un cupo aparte, más chico, para
 * frenar una ráfaga anónima.
 */
export function permitirPorIpOGlobal(
  prefijo: string,
  ip: string | null,
  opts: { porIp: number; sinIp: number; ventanaMs: number },
  ahora = Date.now(),
): boolean {
  if (ip) return consumoPermitido(`${prefijo}:ip:${ip}`, opts.porIp, opts.ventanaMs, ahora);
  return consumoPermitido(`${prefijo}:sin-ip`, opts.sinIp, opts.ventanaMs, ahora);
}

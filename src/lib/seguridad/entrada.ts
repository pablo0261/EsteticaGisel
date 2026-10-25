const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de Postgres. Rechaza texto que no se puede comparar con una columna uuid. */
export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}

/** Id de un pago de Mercado Pago: solo dígitos, largo acotado. */
export function esIdNotificacionMp(valor: string): boolean {
  return /^\d{1,20}$/.test(valor);
}

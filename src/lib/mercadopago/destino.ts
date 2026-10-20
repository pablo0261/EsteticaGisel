/**
 * init_point de Checkout Pro: solo https y un host de Mercado Pago.
 * mercadopago.com.ar.atacante.com no pasa: el dominio tiene que terminar en Mercado Pago.
 */
const HOST = /^(?:[a-z0-9-]+\.)*mercadopago\.(?:com(?:\.[a-z]{2})?|cl)$/;

export function esUrlDeMercadoPago(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === "https:" && HOST.test(u.hostname.toLowerCase());
}

/** Checkout de Mercado Pago, o una ruta interna del sitio (/turnos/gracias). */
export function esDestinoPermitido(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) return true;
  return esUrlDeMercadoPago(url);
}

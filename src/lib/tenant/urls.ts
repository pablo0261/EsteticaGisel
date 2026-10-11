type ConfigUrl = { dominio: string; protocolo: string };

function configUrl(): ConfigUrl {
  return {
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
    protocolo: process.env.PLATFORM_PROTOCOLO || "https",
  };
}

/** URL pública del sitio de un tenant (links de emails, retorno de Mercado Pago). */
export function urlDelTenant(slug: string, cfg: ConfigUrl = configUrl()): string {
  return `${cfg.protocolo}://${slug}.${cfg.dominio}`;
}

/** Link de WhatsApp con mensaje precargado, o null si el tenant no tiene número. */
export function whatsappLink(
  numero: string | null,
  mensaje = "¡Hola! Quería hacer una consulta.",
): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

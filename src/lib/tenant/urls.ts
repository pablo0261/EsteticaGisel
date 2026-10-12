import type { Textos } from "@/lib/i18n/textos";

type ConfigUrl = {
  dominio: string;
  protocolo: string;
  tenantPorDefecto?: string;
  urlTenantPorDefecto?: string;
};

function configUrl(): ConfigUrl {
  return {
    dominio: process.env.PLATFORM_DOMAIN || "localhost:3000",
    protocolo: process.env.PLATFORM_PROTOCOLO || "https",
    tenantPorDefecto: process.env.TENANT_POR_DEFECTO,
    urlTenantPorDefecto: process.env.URL_TENANT_POR_DEFECTO,
  };
}

/**
 * URL pública del sitio de un tenant (links de emails, retorno de Mercado Pago).
 * En demos, el tenant por defecto puede usar una URL fija (ej. un túnel).
 */
export function urlDelTenant(slug: string, cfg: ConfigUrl = configUrl()): string {
  const override = cfg.urlTenantPorDefecto?.trim().replace(/\/+$/, "");
  if (override && slug === cfg.tenantPorDefecto) return override;
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

/** Mensajes precargados de los links de WhatsApp del sitio. */
export const MENSAJES_WHATSAPP = {
  consulta: { es: "¡Hola! Quería hacer una consulta.", pt: "Olá! Gostaria de fazer uma consulta." },
  turno: { es: "¡Hola! Quería consultar por un turno.", pt: "Olá! Gostaria de agendar um horário." },
} satisfies Record<string, Textos>;

import "server-only";
import type { Metadata } from "next";
import { IDIOMA_POR_DEFECTO, traductor, type Textos } from "@/lib/i18n/textos";
import { tenantDelHost } from "@/lib/tenant/actual";

const PANEL: Textos = { es: "Panel", pt: "Painel" };

/** Título de una pantalla del panel en el idioma del cliente del host: "Servicios · Panel". */
export async function metadataDelPanel(titulo?: Textos): Promise<Metadata> {
  const tenant = await tenantDelHost().catch(() => null);
  const t = traductor(tenant?.idioma ?? IDIOMA_POR_DEFECTO);
  return { title: titulo ? `${t(titulo)} · ${t(PANEL)}` : t(PANEL) };
}

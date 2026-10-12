import "server-only";
import type { Metadata } from "next";
import { getTenantPorSlug } from "./actual";
import { IDIOMA_POR_DEFECTO, traducir, type Textos } from "@/lib/i18n/textos";

/** Metadata con el título de la página en el idioma del tenant. */
export async function metadataTraducida(
  params: Promise<{ tenant: string }>,
  titulo: Textos,
): Promise<Metadata> {
  const tenant = await getTenantPorSlug((await params).tenant);
  return { title: traducir(tenant?.idioma ?? IDIOMA_POR_DEFECTO, titulo) };
}

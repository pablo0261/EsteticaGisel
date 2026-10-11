import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverHost, configHost } from "./host";
import { mapearTenant, type FilaTenant } from "./mapear";
import type { Tenant } from "./tipos";

/** Tenant por slug (activo o suspendido), cacheado por request. null si no existe. */
export const getTenantPorSlug = cache(async (slug: string): Promise<Tenant | null> => {
  const { data, error } = await createAdminClient()
    .from("tenants")
    .select("*, tenant_marca(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapearTenant(data as FilaTenant);
});

/** Para páginas bajo /sitio/[tenant]: el layout ya resolvió 404 y suspendido. */
export async function tenantDeLaPagina(params: Promise<{ tenant: string }>): Promise<Tenant> {
  const { tenant: slug } = await params;
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();
  return tenant;
}

/** Tenant activo según el host del request (server actions y route handlers). */
export async function tenantDelRequest(): Promise<Tenant | null> {
  const h = await headers();
  const destino = resolverHost(h.get("host") ?? "", configHost());
  if (destino.tipo !== "tenant") return null;
  const tenant = await getTenantPorSlug(destino.slug);
  return tenant?.estado === "activo" ? tenant : null;
}

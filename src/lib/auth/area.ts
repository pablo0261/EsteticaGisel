import "server-only";
import { headers } from "next/headers";
import { MARCA_PLATAFORMA, marcaEmailDeTenant, type MarcaEmail } from "@/lib/email/layout-marca";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { configHost, resolverHost } from "@/lib/tenant/host";
import { perfilPermitidoEnArea, type Perfil } from "@/lib/tenant/permisos";
import type { Tenant } from "@/lib/tenant/tipos";
import { urlDelTenant, urlMaster } from "@/lib/tenant/urls";
import { rutaDelArea } from "./rutas";

/** Panel al que corresponde el request: el de un tenant activo o el master (app.). */
export type Area = { tipo: "tenant"; tenant: Tenant } | { tipo: "master" };

/** Sale siempre del host, nunca de un campo del formulario. null: tenant inexistente o suspendido. */
export async function areaDelRequest(): Promise<Area | null> {
  const destino = resolverHost((await headers()).get("host") ?? "", configHost());
  if (destino.tipo === "master") return { tipo: "master" };
  const tenant = await tenantDelRequest();
  return tenant ? { tipo: "tenant", tenant } : null;
}

/** Ruta del navegador de una pantalla del área (sin área, la del panel del cliente). */
export function rutaEn(area: Area | null, ruta: string): string {
  return rutaDelArea(area?.tipo ?? "tenant", ruta);
}

/** Origen público del área, para los links de los emails. */
export function urlDelArea(area: Area): string {
  return area.tipo === "tenant" ? urlDelTenant(area.tenant.slug) : urlMaster();
}

export function perfilPermitido(perfil: Perfil | null, area: Area): boolean {
  return perfilPermitidoEnArea(
    perfil,
    area.tipo === "tenant" ? { tipo: "tenant", tenantId: area.tenant.id } : { tipo: "master" },
  );
}

/** Marca de los emails: la del tenant del host, o la neutra de la plataforma para el master. */
export function marcaEmailDelArea(area: Area): MarcaEmail {
  return area.tipo === "tenant" ? marcaEmailDeTenant(area.tenant, urlDelArea(area)) : MARCA_PLATAFORMA;
}

/** Nombre visible del remitente: el del tenant; para el master, PLATFORM_EMAIL_FROM. */
export function remitenteDelArea(area: Area): string | undefined {
  return area.tipo === "tenant" ? area.tenant.nombre : undefined;
}

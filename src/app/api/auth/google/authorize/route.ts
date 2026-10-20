import { NextRequest, NextResponse } from "next/server";
import { secretoMfaValido } from "@/lib/auth/cookie-mfa";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { getAuthUrl } from "@/lib/google-calendar/auth-url";
import { crearEstadoOauth } from "@/lib/google-calendar/estado";
import { appGoogleDelTenant } from "@/lib/integraciones/cuenta";
import { origenDelRequest } from "@/lib/tenant/origen";
import { urlDelTenant } from "@/lib/tenant/urls";

/**
 * Empieza el OAuth de Calendar del cliente que está logueado. Sin sesión, sin app
 * cargada o sin MFA_SECRET no sale a Google y no se muestra ningún token.
 */
export async function GET(request: NextRequest) {
  const aca = (path: string) => NextResponse.redirect(new URL(path, `${origenDelRequest(request)}/`));
  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) return aca("/admin/login");

  const secreto = process.env.MFA_SECRET;
  if (!secretoMfaValido(secreto)) return aca("/admin/conexiones?error=clave_credenciales");
  const app = await appGoogleDelTenant(tenant.id);
  if (!app) return aca("/admin/conexiones?error=google_sin_app");

  const url = getAuthUrl({
    clientId: app.clientId,
    redirectUri: `${urlDelTenant(tenant.slug)}/api/auth/google/callback`,
    state: crearEstadoOauth(secreto, tenant.id, Date.now()),
  });
  return NextResponse.redirect(url);
}

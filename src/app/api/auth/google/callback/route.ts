import { NextRequest, NextResponse } from "next/server";
import { secretoMfaValido } from "@/lib/auth/cookie-mfa";
import { exchangeCodeForTokens } from "@/lib/google-calendar/client";
import { leerEstadoOauth } from "@/lib/google-calendar/estado";
import { appGoogleDelTenant } from "@/lib/integraciones/cuenta";
import { guardarRefreshGoogle } from "@/lib/integraciones/guardar";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { origenDelRequest } from "@/lib/tenant/origen";
import { urlDelTenant } from "@/lib/tenant/urls";
import { permitirPorIpOGlobal } from "@/lib/seguridad/limite-memoria";
import { ipDeCabecera } from "@/lib/turnos/ip";

/**
 * Google vuelve acá con el code. El state tiene que ser de este cliente y de esta sesión.
 * El refresh token se guarda cifrado y no se muestra.
 */
export async function GET(request: NextRequest) {
  const aca = (path: string) => NextResponse.redirect(new URL(path, `${origenDelRequest(request)}/`));
  const ip = ipDeCabecera(request.headers, process.env.CABECERA_IP_CONFIABLE);
  if (!permitirPorIpOGlobal("google-oauth", ip, { porIp: 30, sinIp: 60, ventanaMs: 60_000 })) {
    return aca("/admin/conexiones?error=google_code");
  }
  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) return aca("/admin/login");
  if (request.nextUrl.searchParams.get("error")) return aca("/admin/conexiones?error=google_code");

  const secreto = process.env.MFA_SECRET;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!secretoMfaValido(secreto) || !code || !state) return aca("/admin/conexiones?error=google_estado");
  if (leerEstadoOauth(secreto, state, Date.now()) !== tenant.id) return aca("/admin/conexiones?error=google_estado");

  const app = await appGoogleDelTenant(tenant.id);
  if (!app) return aca("/admin/conexiones?error=google_sin_app");

  try {
    const { refreshToken } = await exchangeCodeForTokens({
      code,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: `${urlDelTenant(tenant.slug)}/api/auth/google/callback`,
    });
    if (!refreshToken) return aca("/admin/conexiones?error=google_code");
    await guardarRefreshGoogle(tenant.id, refreshToken);
    return aca("/admin/conexiones?ok=google_conectado");
  } catch {
    return aca("/admin/conexiones?error=google_code");
  }
}

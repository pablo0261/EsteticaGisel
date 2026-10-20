import "server-only";
import { claveCredenciales } from "@/lib/cripto/clave";
import { cifrar } from "@/lib/cripto/credenciales";
import type { FormMp } from "@/lib/master/formularios";
import { datosDelTenant } from "@/lib/tenant/datos";

async function actualizar(tenantId: string, cambios: Record<string, unknown>): Promise<void> {
  const { error } = await datosDelTenant(tenantId).update("tenant_credenciales", cambios);
  if (error) throw new Error(`guardar credenciales: ${error.message}`);
}

type Fila = { mp_access_token: string | null; mp_origen: string | null; google_client_secret: string | null };

async function leer(tenantId: string): Promise<Fila | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("tenant_credenciales", "mp_access_token, mp_origen, google_client_secret")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Fila;
}

/**
 * Mercado Pago manual, igual que el panel master: un access token nuevo deja el origen
 * en manual y limpia el OAuth. Los campos vacíos mantienen lo guardado. Hace falta
 * access token (nuevo o ya guardado) y, para poder cobrar, el secreto del webhook.
 */
export async function guardarMercadoPagoDeTenant(
  tenantId: string,
  form: FormMp,
): Promise<"ok" | "mp_sin_access_token"> {
  const clave = claveCredenciales();
  const fila = await leer(tenantId);
  if (!form.accessToken && !fila?.mp_access_token) return "mp_sin_access_token";

  const cambios: Record<string, unknown> = {};
  if (form.accessToken) {
    cambios.mp_origen = "manual";
    cambios.mp_access_token = cifrar(clave, form.accessToken, { tenantId, columna: "mp_access_token" });
    cambios.mp_refresh_token = null;
    cambios.mp_token_vence_en = null;
    cambios.mp_user_id = null;
  }
  if (form.webhookSecret) {
    cambios.mp_webhook_secret = cifrar(clave, form.webhookSecret, { tenantId, columna: "mp_webhook_secret" });
  }
  if (form.publicKey) cambios.mp_public_key = form.publicKey;
  if (Object.keys(cambios).length === 0) return "ok";
  if (!fila?.mp_origen) cambios.mp_origen = "manual";
  await actualizar(tenantId, cambios);
  return "ok";
}

export type FormGoogle = { clientId: string; clientSecret: string | null; calendarId: string | null };

/** Guarda la app de Google Cloud. El refresh token lo escribe el callback de OAuth, no este formulario. */
export async function guardarGoogleDeTenant(
  tenantId: string,
  form: FormGoogle,
): Promise<"ok" | "google_sin_secreto"> {
  const fila = await leer(tenantId);
  if (!form.clientSecret && !fila?.google_client_secret) return "google_sin_secreto";
  const cambios: Record<string, unknown> = {
    google_client_id: form.clientId,
    google_calendar_id: form.calendarId,
  };
  if (form.clientSecret) {
    cambios.google_client_secret = cifrar(claveCredenciales(), form.clientSecret, {
      tenantId,
      columna: "google_client_secret",
    });
    // Un secreto nuevo es otra app: el refresh anterior deja de servir.
    cambios.google_refresh_token = null;
  }
  await actualizar(tenantId, cambios);
  return "ok";
}

export async function guardarRefreshGoogle(tenantId: string, refreshToken: string): Promise<void> {
  await actualizar(tenantId, {
    google_refresh_token: cifrar(claveCredenciales(), refreshToken, { tenantId, columna: "google_refresh_token" }),
  });
}

export async function desconectarGoogleDeTenant(tenantId: string): Promise<void> {
  await actualizar(tenantId, { google_refresh_token: null });
}

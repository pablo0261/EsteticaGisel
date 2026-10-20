import "server-only";
import { claveCredenciales } from "@/lib/cripto/clave";
import { descifrar, type ColumnaCifrada } from "@/lib/cripto/credenciales";
import { isGoogleConfigurado } from "@/lib/google-calendar/client";
import { isMpConfigurado } from "@/lib/mercadopago/client";
import { datosDelTenant } from "@/lib/tenant/datos";
import { usaCredencialesGlobales } from "@/lib/tenant/credenciales-globales";
import { esCredencialUsable } from "./real";

/**
 * Credenciales con las que el servidor cobra o escribe en Calendar.
 * Primero las del panel de ese cliente; si no cargó ninguna, las del .env
 * solo para el tenant de TENANT_CREDENCIALES_GLOBALES. Sin ninguna, null:
 * el sitio sigue (reserva sin pago) y el webhook rechaza.
 */
export type CuentaMercadoPago = { accessToken: string; webhookSecret: string };
export type CuentaGoogle = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

const COLUMNAS =
  "mp_access_token, mp_public_key, mp_webhook_secret, google_client_id, google_client_secret, google_refresh_token, google_calendar_id";

type Fila = {
  mp_access_token: string | null;
  mp_public_key: string | null;
  mp_webhook_secret: string | null;
  google_client_id: string | null;
  google_client_secret: string | null;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
};

async function leerFila(tenantId: string): Promise<Fila | null> {
  const { data, error } = await datosDelTenant(tenantId).select("tenant_credenciales", COLUMNAS).maybeSingle();
  if (error || !data) return null;
  return data as unknown as Fila;
}

function claveONull(): Buffer | null {
  try {
    return claveCredenciales();
  } catch {
    return null;
  }
}

function abrir(clave: Buffer | null, tenantId: string, columna: ColumnaCifrada, valor: string | null): string | null {
  if (!clave || !valor) return null;
  try {
    const texto = descifrar(clave, valor, { tenantId, columna });
    return esCredencialUsable(texto) ? texto : null;
  } catch {
    return null;
  }
}

export type EstadoIntegraciones = {
  mpToken: boolean;
  mpSecreto: boolean;
  mpPublicKey: string | null;
  googleClientId: string | null;
  googleSecreto: boolean;
  googleConectado: boolean;
  googleCalendarId: string | null;
};

/** Lo que muestra el panel: nunca un secreto. El tilde solo aparece si el valor guardado sirve. */
export async function estadoIntegraciones(tenantId: string): Promise<EstadoIntegraciones> {
  const clave = claveONull();
  const fila = await leerFila(tenantId);
  const token = abrir(clave, tenantId, "mp_access_token", fila?.mp_access_token ?? null);
  const secreto = abrir(clave, tenantId, "mp_webhook_secret", fila?.mp_webhook_secret ?? null);
  const clientSecret = abrir(clave, tenantId, "google_client_secret", fila?.google_client_secret ?? null);
  const refresh = abrir(clave, tenantId, "google_refresh_token", fila?.google_refresh_token ?? null);
  const clientId = fila?.google_client_id?.trim() ?? "";
  const publicKey = fila?.mp_public_key?.trim() ?? "";
  return {
    mpToken: !!token,
    mpSecreto: !!secreto,
    mpPublicKey: esCredencialUsable(publicKey) ? publicKey : null,
    googleClientId: esCredencialUsable(clientId) ? clientId : null,
    googleSecreto: !!clientSecret,
    googleConectado: !!refresh,
    googleCalendarId: fila?.google_calendar_id?.trim() || null,
  };
}

/** App de Google ya guardada (id y secreto), para poder empezar el OAuth. */
export async function appGoogleDelTenant(tenantId: string): Promise<{ clientId: string; clientSecret: string } | null> {
  const clave = claveONull();
  const fila = await leerFila(tenantId);
  if (!fila) return null;
  const clientId = fila.google_client_id?.trim() ?? "";
  const clientSecret = abrir(clave, tenantId, "google_client_secret", fila.google_client_secret);
  if (!esCredencialUsable(clientId) || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function cuentaMercadoPago(tenantId: string, slug: string): Promise<CuentaMercadoPago | null> {
  const clave = claveONull();
  const fila = await leerFila(tenantId);
  const tokenPanel = abrir(clave, tenantId, "mp_access_token", fila?.mp_access_token ?? null);
  const secretoPanel = abrir(clave, tenantId, "mp_webhook_secret", fila?.mp_webhook_secret ?? null);
  if (tokenPanel && secretoPanel) return { accessToken: tokenPanel, webhookSecret: secretoPanel };
  // A medio cargar no se mezcla con el .env: o están las dos, o no se cobra.
  if (fila?.mp_access_token || fila?.mp_webhook_secret) return null;
  if (!usaCredencialesGlobales(slug) || !isMpConfigurado()) return null;
  const webhookSecret = process.env.MP_WEBHOOK_SECRET ?? "";
  const accessToken = process.env.MP_ACCESS_TOKEN ?? "";
  if (!esCredencialUsable(webhookSecret) || !esCredencialUsable(accessToken)) return null;
  return { accessToken: accessToken.trim(), webhookSecret: webhookSecret.trim() };
}

export async function cuentaGoogle(tenantId: string, slug: string): Promise<CuentaGoogle | null> {
  const clave = claveONull();
  const fila = await leerFila(tenantId);
  const clientId = fila?.google_client_id?.trim() ?? "";
  const clientSecret = abrir(clave, tenantId, "google_client_secret", fila?.google_client_secret ?? null);
  const refreshToken = abrir(clave, tenantId, "google_refresh_token", fila?.google_refresh_token ?? null);
  if (esCredencialUsable(clientId) && clientSecret && refreshToken) {
    return {
      clientId,
      clientSecret,
      refreshToken,
      calendarId: fila?.google_calendar_id?.trim() || "primary",
    };
  }
  if (fila?.google_client_id || fila?.google_client_secret || fila?.google_refresh_token) return null;
  if (!usaCredencialesGlobales(slug) || !isGoogleConfigurado()) return null;
  const id = process.env.GOOGLE_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const refresh = process.env.GOOGLE_REFRESH_TOKEN ?? "";
  if (!esCredencialUsable(id) || !esCredencialUsable(secret) || !esCredencialUsable(refresh)) return null;
  return {
    clientId: id.trim(),
    clientSecret: secret.trim(),
    refreshToken: refresh.trim(),
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary",
  };
}

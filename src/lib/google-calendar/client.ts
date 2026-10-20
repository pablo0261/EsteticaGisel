export { getAuthUrl } from "./auth-url";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function isGoogleConfigurado(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID;
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  return !!id && id !== "xxx.apps.googleusercontent.com" && !!refresh;
}

export type CredencialesGoogle = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

/** Canjea el code de OAuth. No incluye el cuerpo de Google en el error: puede traer tokens. */
export async function exchangeCodeForTokens(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ refreshToken: string | null }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google rechazó el code: ${res.status}`);
  const data = await res.json();
  return { refreshToken: data.refresh_token ?? null };
}

async function getAccessToken(cuenta: Pick<CredencialesGoogle, "clientId" | "clientSecret" | "refreshToken">): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: cuenta.refreshToken,
      client_id: cuenta.clientId,
      client_secret: cuenta.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`No se pudo refrescar el access token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function crearEvento(opts: {
  cuenta: CredencialesGoogle;
  titulo: string;
  descripcion: string;
  inicioIso: string;
  finIso: string;
  clienteEmail: string;
}): Promise<string> {
  const accessToken = await getAccessToken(opts.cuenta);
  const calendarId = opts.cuenta.calendarId || "primary";

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: opts.titulo,
        description: opts.descripcion,
        start: { dateTime: opts.inicioIso },
        end: { dateTime: opts.finIso },
        attendees: [{ email: opts.clienteEmail }],
      }),
    },
  );
  if (!res.ok) throw new Error(`No se pudo crear el evento: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function borrarEvento(eventId: string, cuenta: CredencialesGoogle): Promise<void> {
  const accessToken = await getAccessToken(cuenta);
  const calendarId = cuenta.calendarId || "primary";

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 410 = ya estaba borrado; no es un error a los fines de la cancelación.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`No se pudo borrar el evento: ${res.status}`);
  }
}

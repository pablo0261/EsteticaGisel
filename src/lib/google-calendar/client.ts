export { getAuthUrl } from "./auth-url";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function isGoogleConfigurado(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID;
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  return !!id && id !== "xxx.apps.googleusercontent.com" && !!refresh;
}

/** Canjea el "code" del callback OAuth por tokens (uso único, en la configuración inicial). */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google rechazó el code: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null };
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`No se pudo refrescar el access token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function crearEvento(opts: {
  titulo: string;
  descripcion: string;
  inicioIso: string;
  finIso: string;
  clienteEmail: string;
}): Promise<string> {
  const accessToken = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

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

export async function borrarEvento(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 410 = ya estaba borrado; no es un error a los fines de la cancelación.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`No se pudo borrar el evento: ${res.status}`);
  }
}

const CLIENT_ID = /^[A-Za-z0-9-]{6,80}\.apps\.googleusercontent\.com$/;
const SECRETO = /^[A-Za-z0-9_-]{10,200}$/;
const CALENDARIO = /^[A-Za-z0-9_@.+-]{1,200}$/;

export type FormGoogleApp = { clientId: string; clientSecret: string | null; calendarId: string | null };
export type ErrorGoogle = "google_client_id" | "google_client_secret" | "google_calendar";

/** clientSecret y calendarId null = mantener el secreto y usar el calendario principal. */
export function parsearGoogle(
  fd: FormData,
): { ok: true; valor: FormGoogleApp } | { ok: false; error: ErrorGoogle } {
  const clientId = String(fd.get("google_client_id") ?? "").trim();
  if (!CLIENT_ID.test(clientId)) return { ok: false, error: "google_client_id" };
  const clientSecret = String(fd.get("google_client_secret") ?? "").replace(/\s+/g, "");
  if (clientSecret && !SECRETO.test(clientSecret)) return { ok: false, error: "google_client_secret" };
  const calendarId = String(fd.get("google_calendar_id") ?? "").trim();
  if (calendarId && !CALENDARIO.test(calendarId)) return { ok: false, error: "google_calendar" };
  return {
    ok: true,
    valor: { clientId, clientSecret: clientSecret || null, calendarId: calendarId || null },
  };
}

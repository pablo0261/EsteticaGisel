import { describe, expect, it } from "vitest";
import { parsearGoogle } from "./formularios";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const ID = "123456789-abc.apps.googleusercontent.com";

describe("parsearGoogle", () => {
  it("acepta el id, un secreto y un calendario; el secreto vacío se mantiene", () => {
    expect(parsearGoogle(fd({ google_client_id: ID, google_client_secret: "GOCSPX-secreto", google_calendar_id: "primary" }))).toEqual({
      ok: true,
      valor: { clientId: ID, clientSecret: "GOCSPX-secreto", calendarId: "primary" },
    });
    expect(parsearGoogle(fd({ google_client_id: ID, google_client_secret: "", google_calendar_id: "" }))).toEqual({
      ok: true,
      valor: { clientId: ID, clientSecret: null, calendarId: null },
    });
  });

  it("rechaza un id que no es de Google y un secreto corto", () => {
    expect(parsearGoogle(fd({ google_client_id: "no-es-google", google_client_secret: "" }))).toEqual({
      ok: false,
      error: "google_client_id",
    });
    expect(parsearGoogle(fd({ google_client_id: ID, google_client_secret: "corto" }))).toEqual({
      ok: false,
      error: "google_client_secret",
    });
  });
});

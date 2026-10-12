import { describe, it, expect } from "vitest";
import { sesionConPassword } from "./primer-factor";

describe("sesionConPassword", () => {
  it("acepta la sesión iniciada con contraseña (formato con timestamp, el que emite Supabase)", () => {
    expect(sesionConPassword({ amr: [{ method: "password", timestamp: 1 }] })).toBe(true);
  });

  it("acepta el formato RFC 8176 (lista de strings)", () => {
    expect(sesionConPassword({ amr: ["password"] })).toBe(true);
  });

  it("rechaza una sesión de magic link u OTP (Supabase la marca como otp)", () => {
    expect(sesionConPassword({ amr: [{ method: "otp", timestamp: 1 }] })).toBe(false);
    expect(sesionConPassword({ amr: [{ method: "magiclink", timestamp: 1 }] })).toBe(false);
    expect(sesionConPassword({ amr: ["otp"] })).toBe(false);
  });

  it("rechaza otros métodos (OAuth, anónimo, SSO)", () => {
    for (const method of ["oauth", "anonymous", "sso/saml", "web3"]) {
      expect(sesionConPassword({ amr: [{ method, timestamp: 1 }] })).toBe(false);
    }
  });

  it("rechaza claims sin amr o con amr malformado", () => {
    expect(sesionConPassword({})).toBe(false);
    expect(sesionConPassword({ amr: [] })).toBe(false);
    expect(sesionConPassword({ amr: "password" })).toBe(false);
    expect(sesionConPassword({ amr: [null, 1, {}] })).toBe(false);
    expect(sesionConPassword(null)).toBe(false);
    expect(sesionConPassword(undefined)).toBe(false);
  });
});

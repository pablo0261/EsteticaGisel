import { describe, it, expect } from "vitest";
import {
  MAX_FALLIDOS_POR_EMAIL,
  MAX_FALLIDOS_POR_EMAIL_E_IP,
  MAX_FALLIDOS_POR_EMAIL_SIN_IP,
  MAX_FALLIDOS_POR_IP,
  VENTANA_LOGIN_MS,
  limiteDeSupabase,
  loginPermitido,
} from "./limite-login";

describe("loginPermitido", () => {
  it("límites cada 15 minutos: 5 por email e IP, 20 por IP, 50 por email; 5 por email sin IP", () => {
    expect(VENTANA_LOGIN_MS).toBe(15 * 60 * 1000);
    expect(MAX_FALLIDOS_POR_EMAIL_E_IP).toBe(5);
    expect(MAX_FALLIDOS_POR_IP).toBe(20);
    expect(MAX_FALLIDOS_POR_EMAIL).toBe(50);
    expect(MAX_FALLIDOS_POR_EMAIL_SIN_IP).toBe(5);
  });

  it("con IP conocida bloquea al llegar a cualquiera de los tres límites", () => {
    expect(loginPermitido({ porEmail: 0, ip: { porEmailEIp: 0, porIp: 0 } })).toBe(true);
    expect(loginPermitido({ porEmail: 49, ip: { porEmailEIp: 4, porIp: 19 } })).toBe(true);
    expect(loginPermitido({ porEmail: 5, ip: { porEmailEIp: 5, porIp: 5 } })).toBe(false);
    expect(loginPermitido({ porEmail: 0, ip: { porEmailEIp: 0, porIp: 20 } })).toBe(false);
    expect(loginPermitido({ porEmail: 50, ip: { porEmailEIp: 0, porIp: 0 } })).toBe(false);
  });

  it("con IP conocida, los fallos de otras IP no traban la cuenta (hasta el tope de 50)", () => {
    // Un tercero falló 30 veces con este email desde otras IP: el dueño, desde su IP, entra.
    expect(loginPermitido({ porEmail: 30, ip: { porEmailEIp: 0, porIp: 0 } })).toBe(true);
  });

  it("sin IP conocida solo limita por email, con 5 fallidos", () => {
    expect(loginPermitido({ porEmail: 4, ip: null })).toBe(true);
    expect(loginPermitido({ porEmail: 5, ip: null })).toBe(false);
  });
});

describe("limiteDeSupabase", () => {
  it("reconoce el límite de Supabase por status 429 o por código", () => {
    expect(limiteDeSupabase({ status: 429 })).toBe(true);
    expect(limiteDeSupabase({ code: "over_request_rate_limit" })).toBe(true);
    expect(limiteDeSupabase({ status: 429, code: "over_request_rate_limit" })).toBe(true);
  });

  it("una contraseña mala u otro error no es el límite", () => {
    expect(limiteDeSupabase({ status: 400, code: "invalid_credentials" })).toBe(false);
    expect(limiteDeSupabase({ status: 500 })).toBe(false);
    expect(limiteDeSupabase({})).toBe(false);
    expect(limiteDeSupabase(null)).toBe(false);
  });
});

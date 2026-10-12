import { describe, it, expect } from "vitest";
import { MAX_FALLIDOS_POR_EMAIL, MAX_FALLIDOS_POR_IP, VENTANA_LOGIN_MS, loginPermitido } from "./limite-login";

describe("loginPermitido", () => {
  it("5 fallidos por email y 20 por IP cada 15 minutos", () => {
    expect(VENTANA_LOGIN_MS).toBe(15 * 60 * 1000);
    expect(MAX_FALLIDOS_POR_EMAIL).toBe(5);
    expect(MAX_FALLIDOS_POR_IP).toBe(20);
  });

  it("bloquea al llegar a cualquiera de los dos límites", () => {
    expect(loginPermitido(0, 0)).toBe(true);
    expect(loginPermitido(4, 19)).toBe(true);
    expect(loginPermitido(5, 0)).toBe(false);
    expect(loginPermitido(0, 20)).toBe(false);
  });
});

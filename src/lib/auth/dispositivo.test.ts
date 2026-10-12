import { describe, it, expect } from "vitest";
import {
  COOKIE_DISPOSITIVO,
  VIGENCIA_DISPOSITIVO_MS,
  dispositivoVigente,
  generarTokenDispositivo,
  hashToken,
  tokenConFormato,
  vencimientoDispositivo,
} from "./dispositivo";

const AHORA = new Date("2026-10-12T15:00:00Z");

describe("token del dispositivo", () => {
  it("es aleatorio, de 32 bytes en base64url", () => {
    const a = generarTokenDispositivo();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generarTokenDispositivo()).not.toBe(a);
    expect(tokenConFormato(a)).toBe(true);
  });

  it("rechaza tokens con otro formato", () => {
    expect(tokenConFormato("")).toBe(false);
    expect(tokenConFormato("abc")).toBe(false);
    expect(tokenConFormato(`${"a".repeat(42)}=`)).toBe(false);
  });

  it("en la base se guarda solo su hash", () => {
    const token = generarTokenDispositivo();
    const h = hashToken(token);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashToken(token));
    expect(h).not.toContain(token);
  });

  it("la cookie se llama dispositivo", () => {
    expect(COOKIE_DISPOSITIVO).toBe("dispositivo");
  });
});

describe("dispositivoVigente", () => {
  it("dura 30 días", () => {
    expect(VIGENCIA_DISPOSITIVO_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(vencimientoDispositivo(AHORA).toISOString()).toBe("2026-11-11T15:00:00.000Z");
  });

  it("vale hasta que vence", () => {
    expect(dispositivoVigente({ expira_en: "2026-10-13T00:00:00Z" }, AHORA)).toBe(true);
    expect(dispositivoVigente({ expira_en: AHORA.toISOString() }, AHORA)).toBe(false);
    expect(dispositivoVigente({ expira_en: "2026-10-01T00:00:00Z" }, AHORA)).toBe(false);
  });

  it("revocado (la fila ya no existe) no vale", () => {
    expect(dispositivoVigente(null, AHORA)).toBe(false);
  });
});

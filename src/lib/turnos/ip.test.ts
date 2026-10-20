import { describe, it, expect } from "vitest";
import { LARGO_MAXIMO_IP, bloqueadoSinIp, ipDeCabecera } from "./ip";

describe("ipDeCabecera", () => {
  const cabeceras = (h: Record<string, string>) => new Headers(h);

  it("lee solo la cabecera configurada", () => {
    const h = cabeceras({ "x-real-ip": " 203.0.113.7 ", "x-forwarded-for": "1.2.3.4" });
    expect(ipDeCabecera(h, "x-real-ip")).toBe("203.0.113.7");
    expect(ipDeCabecera(h, " X-Real-IP ")).toBe("203.0.113.7");
  });

  it("sin cabecera configurada no confía en x-forwarded-for", () => {
    const h = cabeceras({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" });
    expect(ipDeCabecera(h, undefined)).toBeNull();
    expect(ipDeCabecera(h, "")).toBeNull();
    expect(ipDeCabecera(h, "  ")).toBeNull();
  });

  it("null si la cabecera no vino o está vacía", () => {
    expect(ipDeCabecera(cabeceras({}), "x-real-ip")).toBeNull();
    expect(ipDeCabecera(cabeceras({ "x-real-ip": "   " }), "x-real-ip")).toBeNull();
  });

  it("recorta a 64 caracteres", () => {
    const ip = ipDeCabecera(cabeceras({ "x-real-ip": "a".repeat(200) }), "x-real-ip");
    expect(ip).toHaveLength(LARGO_MAXIMO_IP);
  });

  it("en producción, sin IP se bloquea; en desarrollo no", () => {
    expect(bloqueadoSinIp("production", null)).toBe(true);
    expect(bloqueadoSinIp("production", "203.0.113.7")).toBe(false);
    expect(bloqueadoSinIp("development", null)).toBe(false);
    expect(bloqueadoSinIp(undefined, null)).toBe(false);
  });

  it("un nombre de cabecera inválido no rompe", () => {
    expect(ipDeCabecera(cabeceras({}), "no válida")).toBeNull();
  });
});

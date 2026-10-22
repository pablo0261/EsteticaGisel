import { describe, expect, it } from "vitest";
import { headersDeSeguridad, politicaContenido } from "./headers";

describe("headersDeSeguridad", () => {
  it("en producción manda CSP, HSTS, X-Frame-Options y Referrer-Policy", () => {
    const headers = headersDeSeguridad({
      produccion: true,
      supabaseUrl: "https://abc.supabase.co",
    });
    const mapa = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(mapa["X-Frame-Options"]).toBe("DENY");
    expect(mapa["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(mapa["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(mapa["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(mapa["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(mapa["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(mapa["Content-Security-Policy"]).toContain("https://abc.supabase.co");
    expect(mapa["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(mapa["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("en desarrollo no manda HSTS y el CSP permite eval de Next", () => {
    const headers = headersDeSeguridad({ produccion: false });
    const mapa = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(mapa["Strict-Transport-Security"]).toBeUndefined();
    expect(politicaContenido({ produccion: false })).toContain("'unsafe-eval'");
    expect(politicaContenido({ produccion: false, supabaseUrl: "no-es-url" })).not.toContain("no-es-url");
  });
});

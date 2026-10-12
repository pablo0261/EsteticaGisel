import { describe, it, expect, afterEach, vi } from "vitest";
import { usaCredencialesGlobales } from "./credenciales-globales";

describe("usaCredencialesGlobales", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("por defecto las credenciales del .env son de gisel", () => {
    vi.stubEnv("TENANT_CREDENCIALES_GLOBALES", "");
    expect(usaCredencialesGlobales("gisel")).toBe(true);
  });

  it("otro tenant no las usa", () => {
    vi.stubEnv("TENANT_CREDENCIALES_GLOBALES", "");
    expect(usaCredencialesGlobales("ana")).toBe(false);
  });

  it("se puede cambiar el dueño por env", () => {
    vi.stubEnv("TENANT_CREDENCIALES_GLOBALES", "ana");
    expect(usaCredencialesGlobales("ana")).toBe(true);
    expect(usaCredencialesGlobales("gisel")).toBe(false);
  });
});

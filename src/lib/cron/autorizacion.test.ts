import { describe, it, expect } from "vitest";
import { cronAutorizado } from "./autorizacion";

describe("cronAutorizado", () => {
  it("acepta el Bearer con el secreto configurado", () => {
    expect(cronAutorizado("Bearer secreto-largo", "secreto-largo")).toBe(true);
  });

  it("rechaza otro secreto o sin cabecera", () => {
    expect(cronAutorizado("Bearer otro", "secreto-largo")).toBe(false);
    expect(cronAutorizado("secreto-largo", "secreto-largo")).toBe(false);
    expect(cronAutorizado(null, "secreto-largo")).toBe(false);
  });

  it("sin CRON_SECRET configurado falla cerrado (ni 'Bearer ' ni 'Bearer undefined' pasan)", () => {
    for (const secreto of [undefined, "", "   "]) {
      expect(cronAutorizado("Bearer ", secreto)).toBe(false);
      expect(cronAutorizado("Bearer undefined", secreto)).toBe(false);
      expect(cronAutorizado(`Bearer ${secreto}`, secreto)).toBe(false);
      expect(cronAutorizado(null, secreto)).toBe(false);
    }
  });
});

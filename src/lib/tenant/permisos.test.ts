import { describe, it, expect } from "vitest";
import { perfilAutorizado, perfilPermitidoEnArea } from "./permisos";

describe("perfilAutorizado", () => {
  it("el cliente entra solo a su tenant", () => {
    expect(perfilAutorizado({ rol: "cliente", tenant_id: "T1" }, "T1")).toBe(true);
    expect(perfilAutorizado({ rol: "cliente", tenant_id: "T1" }, "T2")).toBe(false);
  });

  it("el master entra a cualquier tenant", () => {
    expect(perfilAutorizado({ rol: "master", tenant_id: null }, "T2")).toBe(true);
  });

  it("sin perfil no entra", () => {
    expect(perfilAutorizado(null, "T1")).toBe(false);
  });
});

describe("perfilPermitidoEnArea", () => {
  it("al área master solo entra el master", () => {
    expect(perfilPermitidoEnArea({ rol: "master", tenant_id: null }, { tipo: "master" })).toBe(true);
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T1" }, { tipo: "master" })).toBe(false);
    expect(perfilPermitidoEnArea(null, { tipo: "master" })).toBe(false);
  });

  it("al panel de un tenant entran su cliente y el master", () => {
    const area = { tipo: "tenant", tenantId: "T1" } as const;
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T1" }, area)).toBe(true);
    expect(perfilPermitidoEnArea({ rol: "cliente", tenant_id: "T2" }, area)).toBe(false);
    expect(perfilPermitidoEnArea({ rol: "master", tenant_id: null }, area)).toBe(true);
    expect(perfilPermitidoEnArea(null, area)).toBe(false);
  });
});

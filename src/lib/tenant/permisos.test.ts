import { describe, it, expect } from "vitest";
import { perfilAutorizado } from "./permisos";

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

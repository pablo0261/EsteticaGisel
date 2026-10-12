import { describe, it, expect } from "vitest";
import { COOKIE_MFA, firmarMfa, secretoMfaValido, verificarMfa } from "./cookie-mfa";

const SECRETO = "s".repeat(43);

describe("secretoMfaValido", () => {
  it("exige al menos 32 caracteres", () => {
    expect(secretoMfaValido(SECRETO)).toBe(true);
    expect(secretoMfaValido("corto")).toBe(false);
    expect(secretoMfaValido(undefined)).toBe(false);
  });
});

describe("cookie mfa", () => {
  it("se llama mfa y lleva versión", () => {
    expect(COOKIE_MFA).toBe("mfa");
    expect(firmarMfa(SECRETO, "user-1", "sesion-1")).toMatch(/^v1\.[A-Za-z0-9_-]{43}$/);
  });

  it("vale para el mismo usuario y la misma sesión", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-1", "sesion-1")).toBe(true);
  });

  it("una sesión nueva (otro session_id) la invalida", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-1", "sesion-2")).toBe(false);
  });

  it("no sirve para otro usuario ni con otro secreto", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, valor, "user-2", "sesion-1")).toBe(false);
    expect(verificarMfa("t".repeat(43), valor, "user-1", "sesion-1")).toBe(false);
  });

  it("rechaza valores alterados, vacíos o sin datos de sesión", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(SECRETO, `${valor.slice(0, -2)}xx`, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, "v1.", "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, undefined, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, valor, undefined, "sesion-1")).toBe(false);
    expect(verificarMfa(SECRETO, valor, "user-1", undefined)).toBe(false);
  });

  it("sin secreto válido no verifica nada (falla cerrado)", () => {
    const valor = firmarMfa(SECRETO, "user-1", "sesion-1");
    expect(verificarMfa(undefined, valor, "user-1", "sesion-1")).toBe(false);
    expect(verificarMfa("corto", valor, "user-1", "sesion-1")).toBe(false);
  });
});

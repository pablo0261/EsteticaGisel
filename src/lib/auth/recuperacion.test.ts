import { describe, it, expect } from "vitest";
import {
  LARGO_MINIMO_CONTRASENA,
  MAX_RECUPERACIONES_POR_EMAIL,
  MAX_RECUPERACIONES_POR_IP,
  hashEmail,
  normalizarEmail,
  recuperacionPermitida,
  validarNuevaContrasena,
} from "./recuperacion";

describe("normalizarEmail", () => {
  it("minúsculas y sin espacios", () => {
    expect(normalizarEmail("  Gisel@Example.COM ")).toBe("gisel@example.com");
  });

  it("rechaza lo que no parece un email", () => {
    expect(normalizarEmail("")).toBeNull();
    expect(normalizarEmail("gisel")).toBeNull();
    expect(normalizarEmail("gisel@example")).toBeNull();
    expect(normalizarEmail("gi sel@example.com")).toBeNull();
    expect(normalizarEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("hashEmail", () => {
  const SECRETO = "s".repeat(43);

  it("HMAC-SHA256 en hex, sin el email en claro", () => {
    const h = hashEmail(SECRETO, "gisel@example.com");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashEmail(SECRETO, "gisel@example.com"));
    expect(h).not.toContain("gisel");
  });

  it("depende del secreto y del email", () => {
    const h = hashEmail(SECRETO, "gisel@example.com");
    expect(hashEmail("t".repeat(43), "gisel@example.com")).not.toBe(h);
    expect(hashEmail(SECRETO, "otra@example.com")).not.toBe(h);
  });

  it("sin secreto válido falla cerrado", () => {
    expect(() => hashEmail(undefined, "gisel@example.com")).toThrow();
    expect(() => hashEmail("corto", "gisel@example.com")).toThrow();
  });
});

describe("recuperacionPermitida", () => {
  it("3 pedidos por email y 10 por IP por hora", () => {
    expect(MAX_RECUPERACIONES_POR_EMAIL).toBe(3);
    expect(MAX_RECUPERACIONES_POR_IP).toBe(10);
    expect(recuperacionPermitida(2, 9)).toBe(true);
    expect(recuperacionPermitida(3, 0)).toBe(false);
    expect(recuperacionPermitida(0, 10)).toBe(false);
  });
});

describe("validarNuevaContrasena", () => {
  it("exige un largo mínimo y que coincidan", () => {
    const buena = "x".repeat(LARGO_MINIMO_CONTRASENA);
    expect(validarNuevaContrasena(buena, buena)).toBeNull();
    expect(validarNuevaContrasena("corta", "corta")).toBe("contrasena_corta");
    expect(validarNuevaContrasena(buena, `${buena}y`)).toBe("contrasena_distinta");
  });
});

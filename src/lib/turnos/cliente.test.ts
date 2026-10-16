import { describe, it, expect } from "vitest";
import { LARGO_MAXIMO_NOMBRE_CLIENTE, validarEmailCliente, validarNombreCliente } from "./cliente";

describe("validarEmailCliente", () => {
  it("acepta una dirección y la normaliza (sin espacios alrededor, en minúsculas)", () => {
    expect(validarEmailCliente("  Ana.Perez+turnos@Example.COM ")).toBe("ana.perez+turnos@example.com");
    expect(validarEmailCliente("a@sub.dominio.com.ar")).toBe("a@sub.dominio.com.ar");
    expect(validarEmailCliente("o'neil_x-y@mail-uno.example.org")).toBe("o'neil_x-y@mail-uno.example.org");
  });

  it("rechaza más de un destinatario", () => {
    for (const e of [
      "a@example.com,b@example.com",
      "a@example.com, b@example.com",
      "a@example.com;b@example.com",
      "a@example.com b@example.com",
      "a@example.com,b",
      "Ana <a@example.com>",
      "<a@example.com>",
      "a@example.com>",
      '"a,b"@example.com',
      "a@b@example.com",
    ]) {
      expect(validarEmailCliente(e), e).toBeNull();
    }
  });

  it("rechaza saltos de línea y caracteres de control (inyección de cabeceras)", () => {
    for (const e of [
      "a@example.com\r\nBcc: b@example.com",
      "a@example.com\nb@example.com",
      "a\r@example.com",
      "a\u0000@example.com",
      "a\t@example.com",
      "a@exa mple.com",
    ]) {
      expect(validarEmailCliente(e), JSON.stringify(e)).toBeNull();
    }
  });

  it("rechaza lo que no es local@dominio con un punto en el dominio", () => {
    for (const e of ["", "   ", "ana", "ana@", "@example.com", "ana@example", "ana@.com", "ana@example.", "ana@example..com", "ana@-x.com", "ana@x-.com", ".ana@example.com", "ana.@example.com", "an..a@example.com"]) {
      expect(validarEmailCliente(e), e).toBeNull();
    }
  });

  it("rechaza direcciones de más de 254 caracteres o con la parte local de más de 64", () => {
    const dominio = `${"d".repeat(60)}.${"e".repeat(60)}.${"f".repeat(60)}.com`;
    expect(validarEmailCliente(`${"a".repeat(64)}@${dominio}`)).not.toBeNull();
    expect(validarEmailCliente(`${"a".repeat(65)}@example.com`)).toBeNull();
    expect(validarEmailCliente(`${"a".repeat(60)}@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.${"e".repeat(60)}.com`)).toBeNull();
  });
});

describe("validarNombreCliente", () => {
  it("acepta un nombre y le saca los espacios de los extremos", () => {
    expect(validarNombreCliente("  María José Pérez ")).toBe("María José Pérez");
    expect(validarNombreCliente("x".repeat(LARGO_MAXIMO_NOMBRE_CLIENTE))).toBe("x".repeat(80));
  });

  it("rechaza vacío, más de 80 caracteres y caracteres de control", () => {
    expect(validarNombreCliente("   ")).toBeNull();
    expect(validarNombreCliente("x".repeat(81))).toBeNull();
    for (const n of ["Ana\nPérez", "Ana\r\nBcc: x", "Ana\u0000", "Ana‮B", "Ana\tB"]) {
      expect(validarNombreCliente(n), JSON.stringify(n)).toBeNull();
    }
  });
});

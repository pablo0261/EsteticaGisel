import { describe, it, expect } from "vitest";
import { formatPrecioARS } from "./format";

describe("formatPrecioARS", () => {
  it("formatea enteros con separador de miles y símbolo $", () => {
    expect(formatPrecioARS(15000)).toBe("$ 15.000");
  });

  it("no muestra decimales para montos redondos", () => {
    expect(formatPrecioARS(1500)).toBe("$ 1.500");
  });

  it("maneja cero", () => {
    expect(formatPrecioARS(0)).toBe("$ 0");
  });

  it("redondea montos con decimales", () => {
    expect(formatPrecioARS(1999.9)).toBe("$ 2.000");
  });
});

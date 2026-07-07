import { describe, it, expect } from "vitest";
import { formatPrecioARS, formatDuracion } from "./format";

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

describe("formatDuracion", () => {
  it("horas y minutos", () => {
    expect(formatDuracion(90)).toBe("1h 30min");
  });
  it("solo horas", () => {
    expect(formatDuracion(60)).toBe("1h");
  });
  it("solo minutos", () => {
    expect(formatDuracion(40)).toBe("40min");
  });
  it("dos horas exactas", () => {
    expect(formatDuracion(120)).toBe("2h");
  });
});

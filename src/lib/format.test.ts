import { describe, it, expect } from "vitest";
import { formatPrecio, formatDuracion } from "./format";

describe("formatPrecio", () => {
  it("ARS: símbolo $, separador de miles con punto y sin decimales", () => {
    expect(formatPrecio(15000, "ARS", "es")).toBe("$ 15.000");
    expect(formatPrecio(35000, "ARS", "es")).toBe("$ 35.000");
    expect(formatPrecio(1500, "ARS", "es")).toBe("$ 1.500");
  });

  it("ARS: maneja cero y redondea los decimales", () => {
    expect(formatPrecio(0, "ARS", "es")).toBe("$ 0");
    expect(formatPrecio(1999.9, "ARS", "es")).toBe("$ 2.000");
  });

  it("ARS en un sitio en portugués: mismo formato", () => {
    expect(formatPrecio(35000, "ARS", "pt")).toBe("$ 35.000");
  });

  it("BRL: símbolo R$ y siempre 2 decimales con coma", () => {
    expect(formatPrecio(350, "BRL", "pt")).toBe("R$ 350,00");
    expect(formatPrecio(1234.5, "BRL", "pt")).toBe("R$ 1.234,50");
    expect(formatPrecio(0, "BRL", "pt")).toBe("R$ 0,00");
    expect(formatPrecio(99.999, "BRL", "pt")).toBe("R$ 100,00");
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

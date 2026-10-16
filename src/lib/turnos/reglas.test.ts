import { describe, it, expect } from "vitest";
import { puedeCancelar, calcularMontoSena, mismoMonto, puedeReservar, redondearMonto, sumaEnCentavos } from "./reglas";

describe("puedeCancelar", () => {
  const ahora = "2026-07-10T12:00:00-03:00";

  it("permite cancelar si faltan más horas que el mínimo", () => {
    // Turno pasado mañana a esta hora: faltan 48h.
    expect(
      puedeCancelar({
        fechaHoraIso: "2026-07-12T12:00:00-03:00",
        horasMinimas: 24,
        ahoraIso: ahora,
      }),
    ).toBe(true);
  });

  it("no permite cancelar si falta menos que el mínimo", () => {
    // Turno en 10 horas, mínimo 24h.
    expect(
      puedeCancelar({
        fechaHoraIso: "2026-07-10T22:00:00-03:00",
        horasMinimas: 24,
        ahoraIso: ahora,
      }),
    ).toBe(false);
  });

  it("no permite cancelar un turno que ya pasó", () => {
    expect(
      puedeCancelar({
        fechaHoraIso: "2026-07-09T12:00:00-03:00",
        horasMinimas: 24,
        ahoraIso: ahora,
      }),
    ).toBe(false);
  });

  it("es un límite exacto: exactamente el mínimo de horas SÍ permite", () => {
    expect(
      puedeCancelar({
        fechaHoraIso: "2026-07-11T12:00:00-03:00",
        horasMinimas: 24,
        ahoraIso: ahora,
      }),
    ).toBe(true);
  });
});

describe("calcularMontoSena", () => {
  it("calcula el porcentaje de seña sobre el precio", () => {
    expect(calcularMontoSena(10000, 50, "ARS")).toBe(5000);
    expect(calcularMontoSena(15000, 30, "ARS")).toBe(4500);
  });

  it("redondea a entero en ARS y al centavo en BRL", () => {
    expect(calcularMontoSena(10001, 50, "ARS")).toBe(5001); // 5000.5 -> redondeo
    expect(calcularMontoSena(0.8, 50, "BRL")).toBe(0.4);
    expect(calcularMontoSena(99.99, 30, "BRL")).toBe(30); // 29.997 -> 30.00
    expect(calcularMontoSena(15.5, 50, "BRL")).toBe(7.75);
  });

  it("calcula en centavos enteros, sin errores de coma flotante", () => {
    expect(calcularMontoSena(10.01, 50, "BRL")).toBe(5.01); // 500.5 centavos -> 501
    expect(calcularMontoSena(0.29, 50, "BRL")).toBe(0.15); // 14.5 centavos -> 15
    expect(calcularMontoSena(45, 70, "ARS")).toBe(32); // 31.5 -> 32
    expect(calcularMontoSena(90, 35, "ARS")).toBe(32); // 31.5 -> 32
  });
});

describe("redondearMonto", () => {
  it("ARS sin decimales, BRL con centavos exactos", () => {
    expect(redondearMonto(1000.5, "ARS")).toBe(1001);
    expect(redondearMonto(10.1 + 20.2, "BRL")).toBe(30.3);
    expect(redondearMonto(0.1 + 0.2, "BRL")).toBe(0.3);
    expect(redondearMonto(1.005, "BRL")).toBe(1.01);
  });
});

describe("puedeReservar", () => {
  it("permite reservar si todavía no llegó al máximo", () => {
    expect(puedeReservar(0, 2)).toBe(true);
    expect(puedeReservar(1, 2)).toBe(true);
  });

  it("bloquea al llegar exactamente al máximo", () => {
    expect(puedeReservar(2, 2)).toBe(false);
  });

  it("bloquea si ya lo superó", () => {
    expect(puedeReservar(3, 2)).toBe(false);
  });
});

describe("mismoMonto y sumaEnCentavos (webhook: lo pagado contra lo esperado)", () => {
  it("compara en centavos enteros", () => {
    expect(mismoMonto(0.1 + 0.2, 0.3)).toBe(true);
    expect(mismoMonto(5.01, 5.01)).toBe(true);
    expect(mismoMonto(5.01, 5)).toBe(false);
    expect(mismoMonto(1, 100)).toBe(false);
  });

  it("suma montos en centavos y divide una vez", () => {
    expect(sumaEnCentavos([0.1, 0.2])).toBe(0.3);
    expect(sumaEnCentavos([5.01, 0.15])).toBe(5.16);
    expect(sumaEnCentavos([])).toBe(0);
  });
});

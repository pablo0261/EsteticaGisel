import { describe, it, expect } from "vitest";
import { puedeCancelar, calcularMontoSena } from "./reglas";

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
    expect(calcularMontoSena(10000, 50)).toBe(5000);
    expect(calcularMontoSena(15000, 30)).toBe(4500);
  });

  it("redondea a entero", () => {
    expect(calcularMontoSena(10001, 50)).toBe(5001); // 5000.5 -> redondeo
  });
});

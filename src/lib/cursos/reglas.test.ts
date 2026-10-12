import { describe, it, expect } from "vitest";
import { precioEfectivo, calcularExpiracion, accesoVigente } from "./reglas";

describe("precioEfectivo", () => {
  const ahora = "2026-07-10T12:00:00-03:00";

  it("devuelve el precio normal si no hay oferta activa", () => {
    expect(
      precioEfectivo({
        precio: 10000,
        precioOferta: 7000,
        ofertaActiva: false,
        ofertaDesde: null,
        ofertaHasta: null,
        ahoraIso: ahora,
      }),
    ).toBe(10000);
  });

  it("devuelve el precio de oferta si está activa y sin fechas", () => {
    expect(
      precioEfectivo({
        precio: 10000,
        precioOferta: 7000,
        ofertaActiva: true,
        ofertaDesde: null,
        ofertaHasta: null,
        ahoraIso: ahora,
      }),
    ).toBe(7000);
  });

  it("respeta la ventana de fechas de la oferta", () => {
    const base = {
      precio: 10000,
      precioOferta: 7000,
      ofertaActiva: true,
      ahoraIso: ahora,
    };
    expect(
      precioEfectivo({
        ...base,
        ofertaDesde: "2026-07-01T00:00:00-03:00",
        ofertaHasta: "2026-07-15T00:00:00-03:00",
      }),
    ).toBe(7000);
    expect(
      precioEfectivo({
        ...base,
        ofertaDesde: "2026-08-01T00:00:00-03:00",
        ofertaHasta: null,
      }),
    ).toBe(10000); // todavía no empezó
    expect(
      precioEfectivo({
        ...base,
        ofertaDesde: null,
        ofertaHasta: "2026-07-01T00:00:00-03:00",
      }),
    ).toBe(10000); // ya terminó
  });

  it("sin precio de oferta cargado, usa el precio normal aunque oferta_activa sea true", () => {
    expect(
      precioEfectivo({
        precio: 10000,
        precioOferta: null,
        ofertaActiva: true,
        ofertaDesde: null,
        ofertaHasta: null,
        ahoraIso: ahora,
      }),
    ).toBe(10000);
  });
});

describe("calcularExpiracion", () => {
  it("suma los días de acceso (×24 h) al instante de compra, en UTC", () => {
    expect(calcularExpiracion("2026-07-10T12:00:00-03:00", 7)).toBe("2026-07-17T15:00:00.000Z");
  });

  it("conserva los segundos y milisegundos del instante de compra", () => {
    expect(calcularExpiracion("2026-07-10T12:00:45.123Z", 1)).toBe("2026-07-11T12:00:45.123Z");
  });
});

describe("accesoVigente", () => {
  it("es vigente si todavía no expiró", () => {
    expect(accesoVigente("2026-07-20T00:00:00-03:00", "2026-07-10T00:00:00-03:00")).toBe(true);
  });
  it("no es vigente si ya expiró", () => {
    expect(accesoVigente("2026-07-01T00:00:00-03:00", "2026-07-10T00:00:00-03:00")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { hhmmToMin, minToHhmm, calcularSlots } from "./disponibilidad";

describe("hhmmToMin / minToHhmm", () => {
  it("convierte HH:MM a minutos", () => {
    expect(hhmmToMin("14:00")).toBe(840);
    expect(hhmmToMin("09:30")).toBe(570);
    expect(hhmmToMin("00:00")).toBe(0);
  });
  it("convierte minutos a HH:MM (con cero a la izquierda)", () => {
    expect(minToHhmm(840)).toBe("14:00");
    expect(minToHhmm(570)).toBe("09:30");
    expect(minToHhmm(0)).toBe("00:00");
  });
});

describe("calcularSlots", () => {
  const base = {
    aperturaMin: hhmmToMin("14:00"), // 840
    cierreMin: hhmmToMin("19:00"), // 1140
    duracionMin: 90,
    margenMin: 15,
    stepMin: 30,
    ocupados: [],
  };

  it("día vacío: slots cada 30min que entran completos antes del cierre", () => {
    const slots = calcularSlots(base);
    // 14:00..17:30 (17:30 + 90 = 19:00)
    expect(slots[0]).toBe(hhmmToMin("14:00"));
    expect(slots[slots.length - 1]).toBe(hhmmToMin("17:30"));
    expect(slots).toHaveLength(8);
  });

  it("no ofrece slots que se pasen del cierre", () => {
    const slots = calcularSlots(base);
    expect(slots.every((s) => s + base.duracionMin <= base.cierreMin)).toBe(true);
  });

  it("excluye slots que chocan con un turno ocupado (respetando el margen)", () => {
    const slots = calcularSlots({
      ...base,
      ocupados: [{ inicio: hhmmToMin("15:00"), fin: hhmmToMin("16:30") }],
    });
    // Solo entran los que empiezan >=15min después del turno ocupado.
    expect(slots).toEqual([hhmmToMin("17:00"), hhmmToMin("17:30")]);
  });

  it("respeta desdeMin (no ofrece horarios ya pasados)", () => {
    const slots = calcularSlots({ ...base, desdeMin: hhmmToMin("17:00") });
    expect(slots).toEqual([hhmmToMin("17:00"), hhmmToMin("17:30")]);
  });

  it("día cerrado (apertura >= cierre) devuelve vacío", () => {
    const slots = calcularSlots({ ...base, aperturaMin: 0, cierreMin: 0 });
    expect(slots).toEqual([]);
  });
});

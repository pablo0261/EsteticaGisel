import { describe, it, expect } from "vitest";
import { isoFechaHoraAR, diaSemanaAR, minutosDelDiaAR } from "./fechas";

describe("isoFechaHoraAR", () => {
  it("arma un ISO con offset de Argentina (-03:00)", () => {
    expect(isoFechaHoraAR("2026-07-10", 840)).toBe("2026-07-10T14:00:00-03:00");
    expect(isoFechaHoraAR("2026-07-10", 570)).toBe("2026-07-10T09:30:00-03:00");
  });
});

describe("diaSemanaAR", () => {
  it("devuelve la clave de día correcta", () => {
    expect(diaSemanaAR("2026-07-10")).toBe("vie");
    expect(diaSemanaAR("2026-07-11")).toBe("sab");
    expect(diaSemanaAR("2026-07-12")).toBe("dom");
  });
});

describe("minutosDelDiaAR", () => {
  it("extrae los minutos desde medianoche (hora AR) de un timestamp", () => {
    expect(minutosDelDiaAR("2026-07-10T14:30:00-03:00")).toBe(870);
    expect(minutosDelDiaAR("2026-07-10T09:00:00-03:00")).toBe(540);
  });
});

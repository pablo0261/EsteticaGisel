import { describe, it, expect, vi, afterEach } from "vitest";
import {
  offsetEnZona,
  isoFechaHora,
  diaSemana,
  minutosDelDia,
  sumarDias,
  fechaEnZona,
  fechaHoy,
} from "./fechas";

const AR = "America/Argentina/Buenos_Aires";
const SAO_PAULO = "America/Sao_Paulo";
const MANAOS = "America/Manaus";
const MADRID = "Europe/Madrid";

describe("offsetEnZona", () => {
  it("devuelve el offset de cada zona en ese instante", () => {
    const instante = new Date("2026-07-10T15:00:00Z");
    expect(offsetEnZona(AR, instante)).toBe("-03:00");
    expect(offsetEnZona(SAO_PAULO, instante)).toBe("-03:00");
    expect(offsetEnZona(MANAOS, instante)).toBe("-04:00");
  });

  it("sigue el horario de verano de la zona", () => {
    expect(offsetEnZona(MADRID, new Date("2026-01-15T12:00:00Z"))).toBe("+01:00");
    expect(offsetEnZona(MADRID, new Date("2026-07-15T12:00:00Z"))).toBe("+02:00");
  });
});

describe("isoFechaHora", () => {
  it("arma un ISO con offset de Argentina (-03:00)", () => {
    expect(isoFechaHora("2026-07-10", 840, AR)).toBe("2026-07-10T14:00:00-03:00");
    expect(isoFechaHora("2026-07-10", 570, AR)).toBe("2026-07-10T09:30:00-03:00");
  });

  it("usa el offset de cada zona de Brasil", () => {
    expect(isoFechaHora("2026-07-10", 840, SAO_PAULO)).toBe("2026-07-10T14:00:00-03:00");
    expect(isoFechaHora("2026-07-10", 840, MANAOS)).toBe("2026-07-10T14:00:00-04:00");
    expect(isoFechaHora("2026-07-10", 0, MANAOS)).toBe("2026-07-10T00:00:00-04:00");
  });

  it("usa el offset de la fecha pedida en zonas con horario de verano", () => {
    expect(isoFechaHora("2026-01-10", 600, MADRID)).toBe("2026-01-10T10:00:00+01:00");
    expect(isoFechaHora("2026-07-10", 600, MADRID)).toBe("2026-07-10T10:00:00+02:00");
  });

  it("representa la hora de pared de la zona", () => {
    expect(new Date(isoFechaHora("2026-07-10", 840, MANAOS)).toISOString()).toBe(
      "2026-07-10T18:00:00.000Z",
    );
  });
});

describe("diaSemana", () => {
  it("devuelve la clave de día correcta", () => {
    expect(diaSemana("2026-07-10")).toBe("vie");
    expect(diaSemana("2026-07-11")).toBe("sab");
    expect(diaSemana("2026-07-12")).toBe("dom");
  });
});

describe("minutosDelDia", () => {
  it("extrae los minutos desde medianoche (hora AR) de un timestamp", () => {
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", AR)).toBe(870);
    expect(minutosDelDia("2026-07-10T09:00:00-03:00", AR)).toBe(540);
  });

  it("convierte a la zona pedida", () => {
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", SAO_PAULO)).toBe(870);
    expect(minutosDelDia("2026-07-10T14:30:00-03:00", MANAOS)).toBe(810);
    // 02:00 UTC del 11 son las 22:00 del 10 en Manaos.
    expect(minutosDelDia("2026-07-11T02:00:00Z", MANAOS)).toBe(1320);
  });
});

describe("sumarDias", () => {
  it("suma días cruzando fin de mes y de año", () => {
    expect(sumarDias("2026-07-10", 1)).toBe("2026-07-11");
    expect(sumarDias("2026-07-31", 1)).toBe("2026-08-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("resta con n negativo", () => {
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("fechaEnZona", () => {
  it("devuelve la fecha de calendario del instante en la zona", () => {
    const instante = new Date("2026-07-11T03:30:00Z");
    expect(fechaEnZona(instante, AR)).toBe("2026-07-11"); // 00:30 en AR
    expect(fechaEnZona(instante, SAO_PAULO)).toBe("2026-07-11");
    expect(fechaEnZona(instante, MANAOS)).toBe("2026-07-10"); // 23:30 en Manaos
  });
});

describe("fechaHoy", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("es la fecha de hoy en la zona del negocio", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T03:30:00Z"));
    expect(fechaHoy(AR)).toBe("2026-07-11");
    expect(fechaHoy(MANAOS)).toBe("2026-07-10");
  });
});

describe("isoFechaHora con horas inexistentes (cambio de horario)", () => {
  const casos: [string, string, number][] = [
    [MADRID, "2026-03-29", 150],
    ["America/New_York", "2026-03-08", 150],
    [SAO_PAULO, "2018-11-04", 0],
  ];

  it.each(casos)("%s %s (min %i) no retrocede ni cambia de día", (zona, fecha, m) => {
    const iso = isoFechaHora(fecha, m, zona);
    expect(minutosDelDia(iso, zona)).toBeGreaterThanOrEqual(m);
    expect(fechaEnZona(new Date(iso), zona)).toBe(fecha);
  });
});

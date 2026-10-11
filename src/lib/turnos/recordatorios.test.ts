import { describe, it, expect } from "vitest";
import { recordatorioQueCorresponde } from "./recordatorios";

const turno = "2026-07-20T15:00:00-03:00";
const reservadoConTiempo = "2026-07-10T10:00:00-03:00";

describe("recordatorioQueCorresponde", () => {
  it("no envía nada si faltan más de 48h", () => {
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: reservadoConTiempo,
        ahoraIso: "2026-07-18T14:00:00-03:00", // faltan 49h
        enviados: [],
      }),
    ).toBeNull();
  });

  it("envía el de 48h cuando se abre su ventana", () => {
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: reservadoConTiempo,
        ahoraIso: "2026-07-18T15:05:00-03:00",
        enviados: [],
      }),
    ).toBe("48h");
  });

  it("no repite uno ya enviado", () => {
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: reservadoConTiempo,
        ahoraIso: "2026-07-18T20:00:00-03:00",
        enviados: ["48h"],
      }),
    ).toBeNull();
  });

  it("envía el de 24h y luego el de 2h", () => {
    const base = { fechaHoraIso: turno, creadoEnIso: reservadoConTiempo };
    expect(
      recordatorioQueCorresponde({
        ...base,
        ahoraIso: "2026-07-19T15:00:00-03:00",
        enviados: ["48h"],
      }),
    ).toBe("24h");
    expect(
      recordatorioQueCorresponde({
        ...base,
        ahoraIso: "2026-07-20T13:10:00-03:00",
        enviados: ["48h", "24h"],
      }),
    ).toBe("2h");
  });

  it("si el cron se atrasó, manda solo el más cercano, no los vencidos", () => {
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: reservadoConTiempo,
        ahoraIso: "2026-07-20T14:00:00-03:00", // falta 1h, nunca se envió nada
        enviados: [],
      }),
    ).toBe("2h");
  });

  it("omite un recordatorio si la reserva se hizo dentro de su ventana", () => {
    // Reservó 20h antes: el de 24h no tiene sentido (recién recibió la confirmación).
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: "2026-07-19T19:00:00-03:00",
        ahoraIso: "2026-07-19T19:10:00-03:00",
        enviados: [],
      }),
    ).toBeNull();
  });

  it("no envía nada si el turno ya pasó", () => {
    expect(
      recordatorioQueCorresponde({
        fechaHoraIso: turno,
        creadoEnIso: reservadoConTiempo,
        ahoraIso: "2026-07-20T15:30:00-03:00",
        enviados: [],
      }),
    ).toBeNull();
  });
});

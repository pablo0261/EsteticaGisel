import { describe, it, expect } from "vitest";
import { construirHorarioAtencion, DIAS_SEMANA, resumirHorario } from "./horario";

describe("DIAS_SEMANA", () => {
  it("tiene los 7 días de la semana en orden", () => {
    expect(DIAS_SEMANA.map((d) => d.key)).toEqual([
      "lun",
      "mar",
      "mie",
      "jue",
      "vie",
      "sab",
      "dom",
    ]);
  });
});

describe("construirHorarioAtencion", () => {
  it("incluye solo los días no marcados como cerrados", () => {
    const horario = construirHorarioAtencion([
      { key: "lun", cerrado: false, desde: "14:00", hasta: "19:00" },
      { key: "sab", cerrado: false, desde: "09:00", hasta: "14:00" },
      { key: "dom", cerrado: true, desde: "", hasta: "" },
    ]);
    expect(horario).toEqual({
      lun: ["14:00", "19:00"],
      sab: ["09:00", "14:00"],
    });
  });

  it("omite un día si falta desde/hasta aunque no esté marcado cerrado", () => {
    const horario = construirHorarioAtencion([
      { key: "mar", cerrado: false, desde: "", hasta: "" },
    ]);
    expect(horario).toEqual({});
  });
});

const SEMANA_Y_SABADO: Record<string, [string, string]> = {
  lun: ["14:00", "19:00"],
  mar: ["14:00", "19:00"],
  mie: ["14:00", "19:00"],
  jue: ["14:00", "19:00"],
  vie: ["14:00", "19:00"],
  sab: ["09:00", "14:00"],
};

const SALTEADOS: Record<string, [string, string]> = {
  lun: ["09:00", "13:00"],
  mar: ["09:00", "13:00"],
  jue: ["09:00", "13:00"],
};

describe("resumirHorario", () => {
  it("agrupa días consecutivos con el mismo horario", () => {
    expect(resumirHorario(SEMANA_Y_SABADO, "es")).toEqual([
      { dias: "Lunes a viernes", horas: "14:00 a 19:00 hs" },
      { dias: "Sábados", horas: "09:00 a 14:00 hs" },
    ]);
  });

  it("une dos días con 'y' y no agrupa días salteados", () => {
    expect(resumirHorario(SALTEADOS, "es")).toEqual([
      { dias: "Lunes y martes", horas: "09:00 a 13:00 hs" },
      { dias: "Jueves", horas: "09:00 a 13:00 hs" },
    ]);
  });

  it("en portugués", () => {
    expect(resumirHorario(SEMANA_Y_SABADO, "pt")).toEqual([
      { dias: "Segunda a sexta", horas: "14:00 às 19:00" },
      { dias: "Sábados", horas: "09:00 às 14:00" },
    ]);
    expect(resumirHorario(SALTEADOS, "pt")).toEqual([
      { dias: "Segunda e terça", horas: "09:00 às 13:00" },
      { dias: "Quintas", horas: "09:00 às 13:00" },
    ]);
  });

  it("sin días abiertos devuelve una lista vacía", () => {
    expect(resumirHorario({}, "es")).toEqual([]);
  });
});

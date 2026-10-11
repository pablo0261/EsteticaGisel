import { describe, it, expect } from "vitest";
import {
  plantillaConfirmacionTurno,
  plantillaRecordatorioTurno,
  plantillaCancelacionTurno,
  plantillaCompraCurso,
} from "./plantillas";

describe("plantillaConfirmacionTurno", () => {
  it("incluye el servicio, la fecha y el link de gestión", () => {
    const { subject, html } = plantillaConfirmacionTurno({
      servicio: "Manicuría",
      fechaHoraTexto: "viernes 10 de julio, 14:00",
      linkGestion: "https://esteticagisel.com.ar/turnos/gestion/abc-123",
    });
    expect(subject).toContain("confirmado");
    expect(html).toContain("Manicuría");
    expect(html).toContain("viernes 10 de julio, 14:00");
    expect(html).toContain("https://esteticagisel.com.ar/turnos/gestion/abc-123");
  });
});

describe("plantillaRecordatorioTurno", () => {
  it("incluye el servicio y la fecha", () => {
    const { subject, html } = plantillaRecordatorioTurno({
      servicio: "Masajes",
      fechaHoraTexto: "sábado 11 de julio, 10:00",
      faltaTexto: "2 días",
      linkGestion: "https://esteticagisel.com.ar/turnos/gestion/xyz",
    });
    expect(subject).toContain("Recordatorio");
    expect(subject).toContain("2 días");
    expect(html).toContain("Masajes");
    expect(html).toContain("sábado 11 de julio, 10:00");
  });
});

describe("plantillaCancelacionTurno", () => {
  it("confirma la cancelación", () => {
    const { subject, html } = plantillaCancelacionTurno({
      servicio: "Pedicuría",
      fechaHoraTexto: "lunes 13 de julio, 15:00",
    });
    expect(subject).toContain("cancelado");
    expect(html).toContain("Pedicuría");
  });
});

describe("plantillaCompraCurso", () => {
  it("incluye el título del curso y el link de acceso", () => {
    const { subject, html } = plantillaCompraCurso({
      curso: "Laminado de cejas profesional",
      linkAcceso: "https://esteticagisel.com.ar/cursos/acceso/curso-1",
    });
    expect(subject).toContain("Laminado de cejas profesional");
    expect(html).toContain("https://esteticagisel.com.ar/cursos/acceso/curso-1");
  });
});

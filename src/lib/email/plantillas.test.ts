import { describe, expect, it } from "vitest";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import type { MarcaEmail } from "./layout-marca";
import {
  plantillaCancelacionTurno,
  plantillaCompraCurso,
  plantillaConfirmacionTurno,
  plantillaRecordatorioTurno,
} from "./plantillas";

const ALMA: MarcaEmail = {
  nombre: "Estudio Alma",
  idioma: "es",
  colores: COLORES_PLATAFORMA,
  logoUrl: null,
};

const NORTE: MarcaEmail = {
  nombre: "Salón Norte",
  idioma: "pt",
  colores: { colorPrimario: "#112233", colorSecundario: "#445566", colorFondo: "#f7f7f2", colorTexto: "#111111" },
  logoUrl: "https://norte.example/tenants/norte/logo.png",
};

describe("plantillaConfirmacionTurno", () => {
  it("incluye el servicio, la fecha, el link y la marca de ese tenant", () => {
    const { subject, html } = plantillaConfirmacionTurno({
      marca: ALMA,
      servicio: "Manicuría",
      fechaHoraTexto: "viernes 10 de julio, 14:00",
      linkGestion: "https://alma.example/turnos/gestion/abc-123",
    });
    expect(subject).toContain("confirmado");
    expect(subject).toContain("Manicuría");
    expect(html).toContain("Manicuría");
    expect(html).toContain("viernes 10 de julio, 14:00");
    expect(html).toContain("https://alma.example/turnos/gestion/abc-123");
    expect(html).toContain("Estudio Alma");
    expect(html).toContain(COLORES_PLATAFORMA.colorPrimario);
    expect(html).not.toContain("Gisel");
    expect(html).not.toContain("Salón Norte");
  });
});

describe("plantillaRecordatorioTurno", () => {
  it("incluye el servicio, la fecha y el plazo en el idioma del tenant", () => {
    const es = plantillaRecordatorioTurno({
      marca: ALMA,
      servicio: "Masajes",
      fechaHoraTexto: "sábado 11 de julio, 10:00",
      falta: "48h",
      linkGestion: "https://alma.example/turnos/gestion/xyz",
    });
    expect(es.subject).toContain("Recordatorio");
    expect(es.subject).toContain("2 días");
    expect(es.html).toContain("Masajes");
    expect(es.html).toContain("sábado 11 de julio, 10:00");

    const pt = plantillaRecordatorioTurno({
      marca: NORTE,
      servicio: "Massagem",
      fechaHoraTexto: "sábado",
      falta: "2h",
      linkGestion: "https://norte.example/turnos/gestion/xyz",
    });
    expect(pt.subject).toContain("Lembrete");
    expect(pt.subject).toContain("2 horas");
    expect(pt.html).toContain("Salón Norte");
    expect(pt.html).toContain("#112233");
    expect(pt.html).not.toContain("Estudio Alma");
  });
});

describe("plantillaCancelacionTurno", () => {
  it("confirma la cancelación con la marca del tenant", () => {
    const { subject, html } = plantillaCancelacionTurno({
      marca: ALMA,
      servicio: "Pedicuría",
      fechaHoraTexto: "lunes 13 de julio, 15:00",
    });
    expect(subject).toContain("cancelado");
    expect(html).toContain("Pedicuría");
    expect(html).toContain("Estudio Alma");
  });
});

describe("plantillaCompraCurso", () => {
  it("incluye el título del curso y el link de acceso", () => {
    const { subject, html } = plantillaCompraCurso({
      marca: ALMA,
      curso: "Laminado de cejas profesional",
      linkAcceso: "https://alma.example/cursos/acceso/curso-1",
    });
    expect(subject).toContain("Laminado de cejas profesional");
    expect(html).toContain("https://alma.example/cursos/acceso/curso-1");
    expect(html).toContain("Estudio Alma");
  });

  it("escapa el título para que no se interprete como HTML", () => {
    const { html } = plantillaCompraCurso({
      marca: ALMA,
      curso: `<script>alert(1)</script>`,
      linkAcceso: `https://alma.example/cursos/acceso/a"onclick`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a&quot;onclick");
  });
});

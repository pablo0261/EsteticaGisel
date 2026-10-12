import { describe, it, expect } from "vitest";
import { columnasModulos, MODULOS, modulosDeFila, parsearModulos } from "./modulos";

const TODOS_APAGADOS = { turnos: false, cursos: false, sobreMi: false, testimonios: false, galeria: false, faq: false, whatsapp: false };

describe("módulos", () => {
  it("los 7 módulos del spec, cada uno con su columna y su etiqueta", () => {
    expect(MODULOS.map((m) => m.columna)).toEqual([
      "modulo_turnos", "modulo_cursos", "modulo_sobre_mi", "modulo_testimonios",
      "modulo_galeria", "modulo_faq", "modulo_whatsapp",
    ]);
    for (const m of MODULOS) expect(m.etiqueta).toBeTruthy();
  });

  it("lee las casillas tildadas (las que no llegan quedan apagadas)", () => {
    const fd = new FormData();
    fd.append("modulo_turnos", "on");
    fd.append("modulo_whatsapp", "on");
    fd.append("modulo_cursos", "off");
    expect(parsearModulos(fd)).toEqual({ ...TODOS_APAGADOS, turnos: true, whatsapp: true });
  });

  it("columnas y fila: ida y vuelta", () => {
    const m = { ...TODOS_APAGADOS, sobreMi: true, faq: true };
    expect(columnasModulos(m)).toEqual({
      modulo_turnos: false, modulo_cursos: false, modulo_sobre_mi: true, modulo_testimonios: false,
      modulo_galeria: false, modulo_faq: true, modulo_whatsapp: false,
    });
    expect(modulosDeFila(columnasModulos(m))).toEqual(m);
  });
});

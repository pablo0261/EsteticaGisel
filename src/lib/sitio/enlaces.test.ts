import { describe, it, expect } from "vitest";
import type { Modulos } from "@/lib/tenant/tipos";
import { DESTINO_ENLACE, enlacesDelSitio, type ContenidoSitio } from "./enlaces";

const NINGUNO: Modulos = {
  turnos: false,
  cursos: false,
  sobreMi: false,
  testimonios: false,
  galeria: false,
  faq: false,
  whatsapp: false,
};
const TODOS: Modulos = {
  turnos: true,
  cursos: true,
  sobreMi: true,
  testimonios: true,
  galeria: true,
  faq: true,
  whatsapp: true,
};
const VACIO: ContenidoSitio = { servicios: false, testimonios: false, galeria: false, preguntas: false, cursos: false };
const LLENO: ContenidoSitio = { servicios: true, testimonios: true, galeria: true, preguntas: true, cursos: true };

describe("enlacesDelSitio", () => {
  it("sin módulos ni contenido: solo contacto (el pie siempre está)", () => {
    expect(enlacesDelSitio(NINGUNO, VACIO)).toEqual(["contacto"]);
  });

  it("servicios no depende de un módulo, solo de que haya alguno activo", () => {
    expect(enlacesDelSitio(NINGUNO, { ...VACIO, servicios: true })).toEqual(["servicios", "contacto"]);
  });

  it("un módulo activo sin contenido no se enlaza (sobre mí siempre tiene contenido)", () => {
    expect(enlacesDelSitio(TODOS, VACIO)).toEqual(["sobre-mi", "contacto"]);
  });

  it("el contenido de un módulo apagado no se enlaza", () => {
    expect(enlacesDelSitio(NINGUNO, LLENO)).toEqual(["servicios", "contacto"]);
  });

  it("con todo: el orden del menú", () => {
    expect(enlacesDelSitio(TODOS, LLENO)).toEqual([
      "servicios",
      "sobre-mi",
      "testimonios",
      "galeria",
      "preguntas",
      "cursos",
      "contacto",
    ]);
  });
});

describe("DESTINO_ENLACE", () => {
  it("cada enlace apunta a su sección y tiene etiqueta en los dos idiomas", () => {
    expect(DESTINO_ENLACE.preguntas.href).toBe("/#preguntas-frecuentes");
    expect(DESTINO_ENLACE.galeria.href).toBe("/#galeria");
    expect(DESTINO_ENLACE.cursos.href).toBe("/cursos");
    for (const [clave, destino] of Object.entries(DESTINO_ENLACE)) {
      expect(destino.href, clave).toMatch(/^\//);
      expect(destino.etiqueta.es, clave).toBeTruthy();
      expect(destino.etiqueta.pt, clave).toBeTruthy();
    }
  });
});

import { describe, it, expect } from "vitest";
import type { Modulos } from "@/lib/tenant/tipos";
import { SECCIONES_PANEL, seccionHabilitada, seccionesDelPanel } from "./secciones";

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

describe("seccionesDelPanel", () => {
  it("sin módulos: servicios, horarios y reglas, y textos", () => {
    expect(seccionesDelPanel(NINGUNO).map((s) => s.seccion)).toEqual(["servicios", "configuracion", "textos"]);
  });

  it("con todos los módulos: las ocho secciones, en orden", () => {
    expect(seccionesDelPanel(TODOS).map((s) => s.seccion)).toEqual([
      "turnos",
      "servicios",
      "configuracion",
      "textos",
      "cursos",
      "testimonios",
      "galeria",
      "preguntas",
    ]);
  });

  it("cada módulo agrega solo su sección; WhatsApp y sobre mí no tienen sección propia", () => {
    expect(seccionesDelPanel({ ...NINGUNO, faq: true }).map((s) => s.seccion)).toEqual([
      "servicios",
      "configuracion",
      "textos",
      "preguntas",
    ]);
    expect(seccionesDelPanel({ ...NINGUNO, whatsapp: true, sobreMi: true })).toHaveLength(3);
  });
});

describe("seccionHabilitada", () => {
  it("depende del módulo de la sección", () => {
    expect(seccionHabilitada(NINGUNO, "servicios")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "configuracion")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "textos")).toBe(true);
    expect(seccionHabilitada(NINGUNO, "turnos")).toBe(false);
    expect(seccionHabilitada({ ...NINGUNO, turnos: true }, "turnos")).toBe(true);
    expect(seccionHabilitada({ ...NINGUNO, faq: true }, "preguntas")).toBe(true);
    expect(seccionHabilitada({ ...TODOS, galeria: false }, "galeria")).toBe(false);
    expect(seccionHabilitada({ ...TODOS, testimonios: false }, "testimonios")).toBe(false);
    expect(seccionHabilitada(TODOS, "cursos")).toBe(true);
  });

  it("solo un true habilita (un valor raro de la base no abre la sección)", () => {
    const raro = { ...NINGUNO, turnos: "true", galeria: 1 } as unknown as Modulos;
    expect(seccionHabilitada(raro, "turnos")).toBe(false);
    expect(seccionHabilitada(raro, "galeria")).toBe(false);
  });
});

describe("SECCIONES_PANEL", () => {
  it("rutas únicas bajo /admin y textos en los dos idiomas", () => {
    const rutas = SECCIONES_PANEL.map((s) => s.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const s of SECCIONES_PANEL) {
      expect(s.ruta).toMatch(/^\/admin\/[a-z]+$/);
      for (const textos of [s.titulo, s.descripcion]) {
        expect(textos.es.length, s.seccion).toBeGreaterThan(0);
        expect(textos.pt.length, s.seccion).toBeGreaterThan(0);
      }
    }
  });
});

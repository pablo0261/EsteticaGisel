import { describe, it, expect } from "vitest";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import {
  contraste,
  evaluarPaleta,
  luminancia,
  MINIMO_SECUNDARIO,
  MINIMO_TEXTO,
  normalizarHex,
} from "./contraste";

const GISEL = { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" };

describe("normalizarHex", () => {
  it("expande #rgb y pasa a minúsculas", () => {
    expect(normalizarHex("#ABC")).toBe("#aabbcc");
    expect(normalizarHex(" #1F6F8B ")).toBe("#1f6f8b");
  });

  it("rechaza lo que no es #rgb o #rrggbb", () => {
    for (const v of ["", "abc", "#abcd", "#1f6f8b80", "red", "#ggg"]) expect(normalizarHex(v), v).toBeNull();
  });
});

describe("luminancia y contraste (WCAG 2)", () => {
  it("blanco es 1 y negro es 0", () => {
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
    expect(luminancia("#000")).toBe(0);
  });

  it("negro sobre blanco es 21:1 y un color consigo mismo es 1:1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#1f6f8b", "#1f6f8b")).toBeCloseTo(1, 5);
  });

  it("es simétrico", () => {
    expect(contraste("#1f6f8b", "#f2f7f9")).toBeCloseTo(contraste("#f2f7f9", "#1f6f8b"), 10);
  });

  it("#777 sobre blanco queda apenas debajo de 4,5:1", () => {
    const r = contraste("#777777", "#ffffff");
    expect(r).toBeLessThan(4.5);
    expect(r).toBeGreaterThan(4.4);
  });

  it("lanza con un color inválido", () => {
    expect(() => luminancia("red")).toThrow();
  });
});

describe("evaluarPaleta", () => {
  it("la paleta de la plataforma no tiene problemas", () => {
    expect(evaluarPaleta(COLORES_PLATAFORMA)).toEqual([]);
  });

  it("texto igual al fondo: bloquea", () => {
    const problemas = evaluarPaleta({ ...COLORES_PLATAFORMA, colorTexto: COLORES_PLATAFORMA.colorFondo });
    expect(problemas.map((p) => p.clave)).toEqual(["contraste_texto"]);
    expect(problemas[0].bloquea).toBe(true);
  });

  it("la paleta actual de Gisel no pasa el contraste de los botones (2,56:1)", () => {
    const problemas = evaluarPaleta(GISEL);
    expect(problemas.map((p) => p.clave)).toEqual(["contraste_boton"]);
    expect(problemas[0].bloquea).toBe(true);
    expect(problemas[0].ratio).toBeCloseTo(2.56, 1);
    expect(problemas[0].minimo).toBe(MINIMO_TEXTO);
  });

  it("secundario con poco contraste: solo un aviso", () => {
    const problemas = evaluarPaleta({ ...COLORES_PLATAFORMA, colorSecundario: "#e9ebef" });
    expect(problemas).toEqual([
      expect.objectContaining({ clave: "contraste_secundario", bloquea: false, minimo: MINIMO_SECUNDARIO }),
    ]);
  });
});

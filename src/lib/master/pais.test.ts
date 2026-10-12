import { describe, it, expect } from "vitest";
import { esIdioma, esMoneda, esPais, PAISES, VALORES_POR_PAIS, ZONAS_HORARIAS, zonaPermitida } from "./pais";

describe("países", () => {
  it("valores por defecto del spec", () => {
    expect(VALORES_POR_PAIS.AR).toEqual({ idioma: "es", zonaHoraria: "America/Argentina/Buenos_Aires", moneda: "ARS" });
    expect(VALORES_POR_PAIS.BR).toEqual({ idioma: "pt", zonaHoraria: "America/Sao_Paulo", moneda: "BRL" });
  });

  it("la zona por defecto es la primera de su país y está permitida", () => {
    for (const pais of PAISES) {
      expect(ZONAS_HORARIAS[pais][0]).toBe(VALORES_POR_PAIS[pais].zonaHoraria);
      expect(zonaPermitida(pais, VALORES_POR_PAIS[pais].zonaHoraria)).toBe(true);
    }
  });

  it("cada zona permitida existe en Intl", () => {
    for (const pais of PAISES) {
      for (const zona of ZONAS_HORARIAS[pais]) {
        expect(() => new Intl.DateTimeFormat("es-AR", { timeZone: zona }), zona).not.toThrow();
      }
    }
  });

  it("una zona de otro país no se permite", () => {
    expect(zonaPermitida("AR", "America/Sao_Paulo")).toBe(false);
    expect(zonaPermitida("BR", "America/Manaus")).toBe(true);
    expect(zonaPermitida("BR", "Europe/Madrid")).toBe(false);
  });

  it("guardas de tipo", () => {
    expect(esPais("AR")).toBe(true);
    expect(esPais("UY")).toBe(false);
    expect(esIdioma("pt")).toBe(true);
    expect(esIdioma("en")).toBe(false);
    expect(esMoneda("BRL")).toBe(true);
    expect(esMoneda("USD")).toBe(false);
  });
});

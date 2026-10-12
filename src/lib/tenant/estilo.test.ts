import { describe, it, expect } from "vitest";
import { esColorHex, estiloMarca } from "./estilo";

describe("esColorHex", () => {
  it("acepta #rgb y #rrggbb, con mayúsculas o espacios alrededor", () => {
    for (const v of ["#abc", "#ABC", "#1f6f8b", " #1F6F8B "]) expect(esColorHex(v), v).toBe(true);
  });

  it("rechaza transparencia (#rgba, #rrggbbaa) y cualquier otro formato", () => {
    for (const v of ["#abcd", "#1f6f8b80", "abc", "red", "#ggg", "", "#12345"]) expect(esColorHex(v), v).toBe(false);
  });
});

describe("estiloMarca", () => {
  it("define las 4 variables de color de la marca", () => {
    expect(
      estiloMarca({
        colorPrimario: "#c0899a",
        colorSecundario: "#4e5340",
        colorFondo: "#f6f1ea",
        colorTexto: "#1a1a1a",
      }),
    ).toEqual({
      "--marca-primario": "#c0899a",
      "--marca-secundario": "#4e5340",
      "--marca-fondo": "#f6f1ea",
      "--marca-texto": "#1a1a1a",
    });
  });

  it("omite los valores que no son un color hex (quedan los de globals.css)", () => {
    expect(
      estiloMarca({
        colorPrimario: "red;background:url(https://example.com/x)",
        colorSecundario: " #4E5340 ",
        colorFondo: "",
        colorTexto: "#123",
      }),
    ).toEqual({
      "--marca-secundario": "#4E5340",
      "--marca-texto": "#123",
    });
  });

  it("omite los colores con transparencia", () => {
    expect(
      estiloMarca({ colorPrimario: "#c0899a80", colorSecundario: "#4e53", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" }),
    ).toEqual({ "--marca-fondo": "#f6f1ea", "--marca-texto": "#1a1a1a" });
  });
});

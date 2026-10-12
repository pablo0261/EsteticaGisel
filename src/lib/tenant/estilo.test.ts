import { describe, it, expect } from "vitest";
import { estiloMarca } from "./estilo";

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
});

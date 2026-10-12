import { describe, it, expect } from "vitest";
import { nombreSeguro } from "./nombre-seguro";

describe("nombreSeguro", () => {
  it("reemplaza espacios por guión bajo", () => {
    expect(nombreSeguro("foto final.pdf")).toBe("foto_final.pdf");
  });

  it("neutraliza rutas: la barra pasa a _ y se sacan los puntos iniciales", () => {
    expect(nombreSeguro("../x.pdf")).toBe("_x.pdf");
  });

  it("reemplaza caracteres no ASCII", () => {
    expect(nombreSeguro("ñandú.mp4")).toBe("_and_.mp4");
  });

  it("saca los puntos iniciales de archivos ocultos", () => {
    expect(nombreSeguro(".env")).toBe("env");
  });
});

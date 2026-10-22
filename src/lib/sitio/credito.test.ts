import { describe, expect, it } from "vitest";
import { URL_CERTEA, creditoVisible } from "./credito";

describe("creditoVisible", () => {
  it("apagado por defecto: no hay texto ni enlace", () => {
    expect(creditoVisible(false, "es")).toBeNull();
    expect(creditoVisible(false, "pt")).toBeNull();
  });

  it("encendido muestra el crédito de Certea, sin nombre personal", () => {
    const es = creditoVisible(true, "es");
    const pt = creditoVisible(true, "pt");
    expect(es).toEqual({ texto: "Sitio creado por Certea", href: URL_CERTEA });
    expect(pt).toEqual({ texto: "Site criado por Certea", href: URL_CERTEA });
    expect(URL_CERTEA).toBe("https://certea.com.br");
    for (const linea of [es!.texto, pt!.texto]) {
      expect(linea).not.toMatch(/pablo|besler|gisel/i);
    }
  });
});

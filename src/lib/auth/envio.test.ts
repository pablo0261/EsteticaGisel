import { describe, it, expect } from "vitest";
import { modoEnvio } from "./envio";

describe("modoEnvio", () => {
  it("con la cuenta de la plataforma configurada, por SMTP (en cualquier entorno)", () => {
    expect(modoEnvio({ configurado: true, produccion: true })).toBe("smtp");
    expect(modoEnvio({ configurado: true, produccion: false })).toBe("smtp");
  });

  it("sin cuenta en desarrollo, a la consola del servidor", () => {
    expect(modoEnvio({ configurado: false, produccion: false })).toBe("consola");
  });

  it("sin cuenta en producción, bloqueado: nunca se saltea el segundo factor", () => {
    expect(modoEnvio({ configurado: false, produccion: true })).toBe("bloqueado");
  });
});

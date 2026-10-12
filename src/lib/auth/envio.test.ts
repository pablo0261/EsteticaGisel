import { describe, it, expect } from "vitest";
import { modoEnvio } from "./envio";

const LOCAL = { protocolo: "http", dominio: "localhost:3000" };
const PUBLICO = { protocolo: "https", dominio: "turnos.example.com" };

describe("modoEnvio", () => {
  it("con la cuenta de la plataforma configurada, por SMTP (en cualquier entorno)", () => {
    expect(modoEnvio({ configurado: true, produccion: true, ...PUBLICO })).toBe("smtp");
    expect(modoEnvio({ configurado: true, produccion: false, ...LOCAL })).toBe("smtp");
  });

  it("sin cuenta en desarrollo local, a la consola del servidor", () => {
    expect(modoEnvio({ configurado: false, produccion: false, ...LOCAL })).toBe("consola");
    expect(modoEnvio({ configurado: false, produccion: false, protocolo: "http", dominio: "lvh.me:3000" })).toBe("consola");
    expect(modoEnvio({ configurado: false, produccion: false, protocolo: "https", dominio: "localhost:3000" })).toBe("consola");
  });

  it("sin cuenta en producción, bloqueado: nunca se saltea el segundo factor", () => {
    expect(modoEnvio({ configurado: false, produccion: true, ...PUBLICO })).toBe("bloqueado");
    expect(modoEnvio({ configurado: false, produccion: true, ...LOCAL })).toBe("bloqueado");
  });

  it("sin cuenta, fuera de producción pero con dominio público por https, bloqueado", () => {
    expect(modoEnvio({ configurado: false, produccion: false, ...PUBLICO })).toBe("bloqueado");
    expect(modoEnvio({ configurado: false, produccion: false, protocolo: undefined, dominio: undefined })).toBe("bloqueado");
  });
});

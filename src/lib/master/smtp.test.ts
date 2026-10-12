import { describe, it, expect } from "vitest";
import { clasificarErrorSmtp, textoErrorSmtp } from "./smtp";

describe("clasificarErrorSmtp", () => {
  it("autenticación (EAUTH / 535)", () => {
    const e = Object.assign(new Error("Invalid login: 535 pepe@gmail.com abcdabcdabcdabcd"), { code: "EAUTH", responseCode: 535 });
    expect(clasificarErrorSmtp(e)).toEqual({ clave: "gmail_autenticacion", codigo: 535 });
  });

  it("conexión (timeout, red)", () => {
    expect(clasificarErrorSmtp({ code: "ETIMEDOUT" })).toEqual({ clave: "gmail_conexion", codigo: null });
    expect(clasificarErrorSmtp({ code: "ECONNECTION" })).toEqual({ clave: "gmail_conexion", codigo: null });
    expect(clasificarErrorSmtp({ code: "ESOCKET" }).clave).toBe("gmail_conexion");
  });

  it("cualquier otra cosa", () => {
    expect(clasificarErrorSmtp(new Error("raro"))).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp("texto")).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp(null)).toEqual({ clave: "gmail_otro", codigo: null });
    expect(clasificarErrorSmtp({ responseCode: "535" })).toEqual({ clave: "gmail_otro", codigo: null });
  });
});

describe("textoErrorSmtp", () => {
  it("vocabulario fijo más el código: nunca el mensaje original", () => {
    const e = Object.assign(new Error("Invalid login: pepe@gmail.com abcdabcdabcdabcd"), { code: "EAUTH", responseCode: 535 });
    const texto = textoErrorSmtp(clasificarErrorSmtp(e));
    expect(texto).toBe("Gmail rechazó el usuario o la contraseña de aplicación (código 535)");
    expect(texto).not.toContain("pepe");
    expect(texto).not.toContain("abcd");
    expect(textoErrorSmtp({ clave: "gmail_conexion", codigo: null })).toBe("No se pudo conectar con el servidor de Gmail");
  });
});

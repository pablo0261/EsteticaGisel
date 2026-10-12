import { describe, it, expect } from "vitest";
import { LOCALES, traducir, traductor } from "./textos";

describe("traducir", () => {
  it("devuelve el texto del idioma pedido", () => {
    const textos = { es: "Reservar turno", pt: "Agendar horário" };
    expect(traducir("es", textos)).toBe("Reservar turno");
    expect(traducir("pt", textos)).toBe("Agendar horário");
  });

  it("exige todas las claves (si falta una, no compila)", () => {
    // @ts-expect-error falta la traducción al portugués
    expect(traducir("es", { es: "Hola" })).toBe("Hola");
  });
});

describe("traductor", () => {
  it("fija el idioma y traduce cada texto", () => {
    const t = traductor("pt");
    expect(t({ es: "Servicios", pt: "Serviços" })).toBe("Serviços");
  });
});

describe("LOCALES", () => {
  it("usa el locale de cada país para Intl y para el lang del HTML", () => {
    expect(LOCALES).toEqual({ es: "es-AR", pt: "pt-BR" });
  });
});

import { describe, it, expect } from "vitest";
import { urlDelTenant, whatsappLink } from "./urls";

describe("urlDelTenant", () => {
  it("arma la URL del subdominio del tenant", () => {
    expect(urlDelTenant("gisel", { dominio: "tuproducto.com", protocolo: "https" })).toBe(
      "https://gisel.tuproducto.com",
    );
    expect(urlDelTenant("gisel", { dominio: "localhost:3000", protocolo: "http" })).toBe(
      "http://gisel.localhost:3000",
    );
  });
});

describe("whatsappLink", () => {
  it("arma el link de wa.me con el número sin + ni espacios y el mensaje codificado", () => {
    expect(whatsappLink("+54 9 11 2345-6789", "¡Hola!")).toBe(
      "https://wa.me/5491123456789?text=%C2%A1Hola!",
    );
  });

  it("usa un mensaje por defecto", () => {
    expect(whatsappLink("+5491123456789")).toContain("https://wa.me/5491123456789?text=");
  });

  it("devuelve null si no hay número", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("")).toBeNull();
  });
});

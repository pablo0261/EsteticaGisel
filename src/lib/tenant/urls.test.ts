import { describe, it, expect } from "vitest";
import { urlDelTenant, urlMaster, whatsappLink } from "./urls";

describe("urlDelTenant", () => {
  it("arma la URL del subdominio del tenant", () => {
    expect(urlDelTenant("gisel", { dominio: "tuproducto.com", protocolo: "https" })).toBe(
      "https://gisel.tuproducto.com",
    );
    expect(urlDelTenant("gisel", { dominio: "localhost:3000", protocolo: "http" })).toBe(
      "http://gisel.localhost:3000",
    );
  });

  const base = { dominio: "tuproducto.com", protocolo: "https" };

  it("usa la URL de override para el tenant por defecto (demos con túnel)", () => {
    expect(
      urlDelTenant("gisel", {
        ...base,
        tenantPorDefecto: "gisel",
        urlTenantPorDefecto: "https://abc.trycloudflare.com",
      }),
    ).toBe("https://abc.trycloudflare.com");
  });

  it("ignora el override para otros tenants", () => {
    expect(
      urlDelTenant("ana", {
        ...base,
        tenantPorDefecto: "gisel",
        urlTenantPorDefecto: "https://abc.trycloudflare.com",
      }),
    ).toBe("https://ana.tuproducto.com");
  });

  it("recorta espacios y la barra final del override", () => {
    expect(
      urlDelTenant("gisel", {
        ...base,
        tenantPorDefecto: "gisel",
        urlTenantPorDefecto: "  https://abc.trycloudflare.com/ ",
      }),
    ).toBe("https://abc.trycloudflare.com");
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

describe("urlMaster", () => {
  it("es el subdominio app. de la plataforma", () => {
    expect(urlMaster({ dominio: "tuproducto.com", protocolo: "https" })).toBe("https://app.tuproducto.com");
    expect(urlMaster({ dominio: "localhost:3000", protocolo: "http" })).toBe("http://app.localhost:3000");
  });
});

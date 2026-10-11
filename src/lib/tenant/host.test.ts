import { describe, it, expect } from "vitest";
import { resolverHost, esSlugValido } from "./host";

const cfg = { dominio: "tuproducto.com" };

describe("esSlugValido", () => {
  it("acepta minúsculas, números y guiones internos, de 3 a 40 caracteres", () => {
    expect(esSlugValido("gisel")).toBe(true);
    expect(esSlugValido("estetica-ana-2")).toBe(true);
  });

  it("rechaza mayúsculas, puntos, guiones en los bordes, longitudes inválidas y reservados", () => {
    expect(esSlugValido("Gisel")).toBe(false);
    expect(esSlugValido("a.b")).toBe(false);
    expect(esSlugValido("-gisel")).toBe(false);
    expect(esSlugValido("gisel-")).toBe(false);
    expect(esSlugValido("ab")).toBe(false);
    expect(esSlugValido("a".repeat(41))).toBe(false);
    expect(esSlugValido("app")).toBe(false);
    expect(esSlugValido("www")).toBe(false);
  });
});

describe("resolverHost", () => {
  it("un subdominio válido es un tenant", () => {
    expect(resolverHost("gisel.tuproducto.com", cfg)).toEqual({ tipo: "tenant", slug: "gisel" });
  });

  it("ignora mayúsculas del host", () => {
    expect(resolverHost("Gisel.TuProducto.com", cfg)).toEqual({ tipo: "tenant", slug: "gisel" });
  });

  it("app. es el panel master", () => {
    expect(resolverHost("app.tuproducto.com", cfg)).toEqual({ tipo: "master" });
  });

  it("el dominio pelado y www son la raíz", () => {
    expect(resolverHost("tuproducto.com", cfg)).toEqual({ tipo: "raiz" });
    expect(resolverHost("www.tuproducto.com", cfg)).toEqual({ tipo: "raiz" });
  });

  it("funciona con puerto en desarrollo", () => {
    const dev = { dominio: "localhost:3000" };
    expect(resolverHost("gisel.localhost:3000", dev)).toEqual({ tipo: "tenant", slug: "gisel" });
    expect(resolverHost("localhost:3000", dev)).toEqual({ tipo: "raiz" });
  });

  it("subdominios anidados, reservados o inválidos son desconocidos", () => {
    expect(resolverHost("a.gisel.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("api.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("x.tuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
  });

  it("un host ajeno usa el tenant por defecto si está configurado", () => {
    expect(resolverHost("abc.trycloudflare.com", cfg)).toEqual({ tipo: "desconocido" });
    expect(resolverHost("abc.trycloudflare.com", { ...cfg, tenantPorDefecto: "gisel" })).toEqual({
      tipo: "tenant",
      slug: "gisel",
    });
  });

  it("no confunde un dominio que solo termina igual", () => {
    expect(resolverHost("gisel.otrotuproducto.com", cfg)).toEqual({ tipo: "desconocido" });
  });
});

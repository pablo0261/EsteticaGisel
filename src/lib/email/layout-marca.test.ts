import { describe, it, expect } from "vitest";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import type { Tenant } from "@/lib/tenant/tipos";
import {
  MARCA_PLATAFORMA,
  botonMarca,
  escaparHtml,
  layoutMarca,
  logoAbsoluto,
  marcaEmailDeTenant,
  type MarcaEmail,
} from "./layout-marca";

const GISEL: MarcaEmail = {
  nombre: "Estética Gisel",
  idioma: "es",
  colores: { colorPrimario: "#c0899a", colorSecundario: "#4e5340", colorFondo: "#f6f1ea", colorTexto: "#1a1a1a" },
  logoUrl: "https://gisel.tuproducto.com/brand/horizontal-negro.png",
};

describe("escaparHtml", () => {
  it("escapa los caracteres de HTML", () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("layoutMarca", () => {
  it("usa los colores, el logo y el idioma de la marca", () => {
    const html = layoutMarca(GISEL, { titulo: "Título", cuerpoHtml: "<p>Cuerpo</p>" });
    expect(html).toContain('<html lang="es-AR">');
    expect(html).toContain("background-color:#f6f1ea");
    expect(html).toContain("border-top:4px solid #c0899a");
    expect(html).toContain('src="https://gisel.tuproducto.com/brand/horizontal-negro.png"');
    expect(html).toContain("<p>Cuerpo</p>");
    expect(html).toContain("Título");
  });

  it("en portugués declara pt-BR", () => {
    expect(layoutMarca({ ...GISEL, idioma: "pt" }, { titulo: "T", cuerpoHtml: "" })).toContain('<html lang="pt-BR">');
  });

  it("sin logo muestra el nombre, escapado", () => {
    const html = layoutMarca({ ...GISEL, nombre: "<b>Spa</b>", logoUrl: null }, { titulo: "T", cuerpoHtml: "" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;b&gt;Spa&lt;/b&gt;");
    expect(html).not.toContain("<b>Spa</b>");
  });

  it("un color inválido cae al de la plataforma (no inyecta CSS)", () => {
    const html = layoutMarca(
      { ...GISEL, colores: { ...GISEL.colores, colorPrimario: "red;background:url(x)" } },
      { titulo: "T", cuerpoHtml: "" },
    );
    expect(html).not.toContain("url(x)");
    expect(html).toContain(`border-top:4px solid ${COLORES_PLATAFORMA.colorPrimario}`);
  });
});

describe("botonMarca", () => {
  it("escapa el link y usa el color primario", () => {
    const html = botonMarca(GISEL, "Entrar", "https://x.com/a?b=1&c=2");
    expect(html).toContain('href="https://x.com/a?b=1&amp;c=2"');
    expect(html).toContain("background-color:#c0899a");
  });
});

describe("logoAbsoluto", () => {
  it("completa las rutas relativas con la URL del sitio", () => {
    expect(logoAbsoluto("/brand/logo.png", "https://gisel.tuproducto.com/")).toBe(
      "https://gisel.tuproducto.com/brand/logo.png",
    );
    expect(logoAbsoluto("https://cdn.x.com/l.png", "https://a.com")).toBe("https://cdn.x.com/l.png");
  });

  it("descarta lo que no es una URL utilizable", () => {
    expect(logoAbsoluto(null, "https://a.com")).toBeNull();
    expect(logoAbsoluto("//evil.com/x.png", "https://a.com")).toBeNull();
    expect(logoAbsoluto("javascript:alert(1)", "https://a.com")).toBeNull();
  });
});

describe("marcas", () => {
  it("la del tenant sale de su nombre, idioma, colores y logo", () => {
    const tenant = {
      nombre: "Studio Demo",
      idioma: "pt",
      marca: {
        colorPrimario: "#1f6f8b",
        colorSecundario: "#2d4a53",
        colorFondo: "#f2f7f9",
        colorTexto: "#102027",
        logoUrl: "/brand/demo.png",
      },
    } as unknown as Tenant;
    expect(marcaEmailDeTenant(tenant, "http://demo-br.localhost:3000")).toEqual({
      nombre: "Studio Demo",
      idioma: "pt",
      colores: { colorPrimario: "#1f6f8b", colorSecundario: "#2d4a53", colorFondo: "#f2f7f9", colorTexto: "#102027" },
      logoUrl: "http://demo-br.localhost:3000/brand/demo.png",
    });
  });

  it("la de la plataforma (master) es neutra y en español", () => {
    expect(MARCA_PLATAFORMA.idioma).toBe("es");
    expect(MARCA_PLATAFORMA.colores).toEqual(COLORES_PLATAFORMA);
    expect(MARCA_PLATAFORMA.logoUrl).toBeNull();
  });
});

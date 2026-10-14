import { describe, it, expect } from "vitest";
import {
  normalizarInstagram,
  parsearAlta,
  parsearColores,
  parsearDatos,
  parsearGmail,
  parsearMp,
  parsearTextos,
} from "./formularios";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const DATOS_AR = {
  nombre: "Estética Ana",
  pais: "AR",
  idioma: "es",
  zona_horaria: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
};

describe("parsearAlta y parsearDatos", () => {
  it("rechaza caracteres de control en el nombre", () => {
    expect(parsearDatos(fd({ ...DATOS_AR, nombre: "Ana\u0007 Spa" }))).toEqual({ ok: false, error: "texto_invalido" });
  });

  it("alta válida: subdominio normalizado y módulos tildados", () => {
    expect(parsearAlta(fd({ ...DATOS_AR, slug: "  Ana-Spa ", modulo_turnos: "on", modulo_galeria: "on" }))).toEqual({
      ok: true,
      valor: {
        nombre: "Estética Ana",
        slug: "ana-spa",
        pais: "AR",
        idioma: "es",
        zonaHoraria: "America/Argentina/Buenos_Aires",
        moneda: "ARS",
        modulos: { turnos: true, cursos: false, sobreMi: false, testimonios: false, galeria: true, faq: false, whatsapp: false },
      },
    });
  });

  it("subdominio inválido o reservado", () => {
    for (const slug of ["admin", "app", "ab", "-ana", "ana_spa", "ana.spa", ""]) {
      expect(parsearAlta(fd({ ...DATOS_AR, slug })), slug).toEqual({ ok: false, error: "slug_invalido" });
    }
  });

  it("idioma y moneda son editables (un cliente de Brasil en español)", () => {
    const r = parsearDatos(fd({ ...DATOS_AR, pais: "BR", idioma: "es", zona_horaria: "America/Manaus", moneda: "ARS" }));
    expect(r).toEqual({
      ok: true,
      valor: { nombre: "Estética Ana", pais: "BR", idioma: "es", zonaHoraria: "America/Manaus", moneda: "ARS" },
    });
  });

  it("cada campo inválido tiene su error", () => {
    expect(parsearDatos(fd({ ...DATOS_AR, nombre: "A" }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearDatos(fd({ ...DATOS_AR, nombre: "x".repeat(81) }))).toEqual({ ok: false, error: "nombre" });
    expect(parsearDatos(fd({ ...DATOS_AR, pais: "UY" }))).toEqual({ ok: false, error: "pais" });
    expect(parsearDatos(fd({ ...DATOS_AR, idioma: "en" }))).toEqual({ ok: false, error: "idioma" });
    expect(parsearDatos(fd({ ...DATOS_AR, zona_horaria: "America/Sao_Paulo" }))).toEqual({ ok: false, error: "zona" });
    expect(parsearDatos(fd({ ...DATOS_AR, moneda: "USD" }))).toEqual({ ok: false, error: "moneda" });
  });
});

describe("parsearColores", () => {
  const PALETA = { color_primario: "#1F6F8B", color_secundario: "#2d4a53", color_fondo: "#f2f7f9", color_texto: "#102" };

  it("paleta válida, normalizada", () => {
    expect(parsearColores(fd(PALETA))).toEqual({
      ok: true,
      valor: {
        colores: { colorPrimario: "#1f6f8b", colorSecundario: "#2d4a53", colorFondo: "#f2f7f9", colorTexto: "#110022" },
        avisos: [],
      },
    });
  });

  it("transparencia o formato inválido", () => {
    expect(parsearColores(fd({ ...PALETA, color_primario: "#1f6f8b80" }))).toEqual({ ok: false, error: "color_invalido" });
    expect(parsearColores(fd({ ...PALETA, color_fondo: "white" }))).toEqual({ ok: false, error: "color_invalido" });
    expect(parsearColores(fd({ color_primario: "#1f6f8b" }))).toEqual({ ok: false, error: "color_invalido" });
  });

  it("contraste que bloquea", () => {
    expect(parsearColores(fd({ ...PALETA, color_texto: "#f2f7f9" }))).toEqual({ ok: false, error: "contraste_texto" });
    const gisel = { color_primario: "#c0899a", color_secundario: "#4e5340", color_fondo: "#f6f1ea", color_texto: "#1a1a1a" };
    expect(parsearColores(fd(gisel))).toEqual({ ok: false, error: "contraste_boton" });
  });

  it("secundario con poco contraste: se acepta con aviso", () => {
    const r = parsearColores(fd({ ...PALETA, color_secundario: "#e6eef1" }));
    expect(r.ok && r.valor.avisos).toEqual(["contraste_secundario"]);
  });
});

describe("normalizarInstagram", () => {
  it("usuario con o sin @, o URL del perfil", () => {
    expect(normalizarInstagram("@ana.spa")).toBe("ana.spa");
    expect(normalizarInstagram("ana_spa")).toBe("ana_spa");
    expect(normalizarInstagram("gisel.estetica")).toBe("gisel.estetica");
    expect(normalizarInstagram("https://www.instagram.com/ana.spa/?igsh=abc")).toBe("ana.spa");
    expect(normalizarInstagram("instagram.com/ana.spa")).toBe("ana.spa");
  });

  it("rechaza lo que no es un usuario", () => {
    for (const v of [".", "..", "a..b", ".a", "a.", "ana spa", "<b>", "a".repeat(31), "https://example.com/ana", ""]) expect(normalizarInstagram(v), v).toBeNull();
  });
});

describe("parsearTextos", () => {
  const TEXTOS = {
    rubro: "Estética",
    tagline: "",
    inicio_titulo: "Tu momento de",
    inicio_destacado: "bienestar",
    inicio_texto: "",
    sobre_mi_titulo: "",
    sobre_mi_texto: "",
    nota_reservas: "",
    whatsapp: "11 2345 6789",
    instagram: "@ana.spa",
    email_contacto: " Hola@Ana.com ",
    direccion: "",
  };

  it("válidos: vacíos a null, WhatsApp en E.164 según el país, email en minúsculas", () => {
    expect(parsearTextos(fd(TEXTOS), "AR")).toEqual({
      ok: true,
      valor: {
        rubro: "Estética",
        tagline: null,
        inicioTitulo: "Tu momento de",
        inicioDestacado: "bienestar",
        inicioTexto: null,
        sobreMiTitulo: null,
        sobreMiTexto: null,
        notaReservas: null,
        whatsapp: "+5491123456789",
        instagram: "ana.spa",
        emailContacto: "hola@ana.com",
        direccion: null,
      },
    });
    const br = parsearTextos(fd({ ...TEXTOS, whatsapp: "(11) 91234-5678" }), "BR");
    expect(br.ok && br.valor.whatsapp).toBe("+5511912345678");
  });

  it("el WhatsApp tiene que ser del país del cliente", () => {
    for (const w of ["+1 415 555 2671", "+55 11 91234-5678"]) {
      expect(parsearTextos(fd({ ...TEXTOS, whatsapp: w }), "AR"), w).toEqual({ ok: false, error: "whatsapp" });
    }
    expect(parsearTextos(fd({ ...TEXTOS, whatsapp: "+54 9 11 2345 6789" }), "BR")).toEqual({ ok: false, error: "whatsapp" });
  });

  it("rechaza caracteres de control; los textos largos admiten saltos de línea", () => {
    for (const campo of ["inicio_titulo", "rubro", "tagline", "inicio_destacado", "sobre_mi_titulo"]) {
      expect(parsearTextos(fd({ ...TEXTOS, [campo]: "a\nb" }), "AR"), campo).toEqual({ ok: false, error: "texto_invalido" });
    }
    expect(parsearTextos(fd({ ...TEXTOS, inicio_texto: "a\u0000b" }), "AR")).toEqual({ ok: false, error: "texto_invalido" });
    const ok = parsearTextos(fd({ ...TEXTOS, sobre_mi_texto: "línea 1\r\nlínea 2\n\nlínea 3" }), "AR");
    expect(ok.ok).toBe(true);
  });

  it("campos vacíos opcionales: WhatsApp, Instagram y email en null", () => {
    const r = parsearTextos(fd({ inicio_titulo: "Hola" }), "AR");
    expect(r.ok && [r.valor.whatsapp, r.valor.instagram, r.valor.emailContacto]).toEqual([null, null, null]);
  });

  it("cada error", () => {
    expect(parsearTextos(fd({ ...TEXTOS, inicio_titulo: " " }), "AR")).toEqual({ ok: false, error: "inicio_titulo" });
    expect(parsearTextos(fd({ ...TEXTOS, inicio_texto: "x".repeat(2001) }), "AR")).toEqual({ ok: false, error: "texto_largo" });
    expect(parsearTextos(fd({ ...TEXTOS, whatsapp: "123" }), "AR")).toEqual({ ok: false, error: "whatsapp" });
    expect(parsearTextos(fd({ ...TEXTOS, instagram: "ana spa" }), "AR")).toEqual({ ok: false, error: "instagram" });
    expect(parsearTextos(fd({ ...TEXTOS, email_contacto: "hola" }), "AR")).toEqual({ ok: false, error: "email_contacto" });
  });
});

describe("parsearGmail", () => {
  it("contraseña de aplicación con o sin espacios; vacía = mantener", () => {
    expect(
      parsearGmail(fd({ smtp_usuario: "Turnos@Gmail.com", smtp_password: "abcd efgh ijkl mnop", smtp_nombre_remitente: "Estética Ana" })),
    ).toEqual({ ok: true, valor: { usuario: "turnos@gmail.com", contrasena: "abcdefghijklmnop", remitente: "Estética Ana" } });
    expect(parsearGmail(fd({ smtp_usuario: "turnos@gmail.com", smtp_password: "", smtp_nombre_remitente: "" }))).toEqual({
      ok: true,
      valor: { usuario: "turnos@gmail.com", contrasena: null, remitente: null },
    });
  });

  it("cada error", () => {
    expect(parsearGmail(fd({ smtp_usuario: "turnos" }))).toEqual({ ok: false, error: "gmail_usuario" });
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_password: "corta" }))).toEqual({ ok: false, error: "gmail_contrasena" });
    expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: "Ana\nBcc: x@y.com" }))).toEqual({
      ok: false,
      error: "gmail_remitente",
    });
    // Cualquier carácter de control, no solo los saltos de línea.
    for (const remitente of ["Ana\tB", "Ana\u0000", "Ana\u007f"]) {
      expect(parsearGmail(fd({ smtp_usuario: "t@gmail.com", smtp_nombre_remitente: remitente })), JSON.stringify(remitente)).toEqual({
        ok: false,
        error: "gmail_remitente",
      });
    }
  });
});

describe("parsearMp", () => {
  const MP = {
    mp_access_token: "APP_USR-1234567890123456-101112-abcdef0123456789abcdef0123456789-123456789",
    mp_public_key: "APP_USR-12345678-1234-1234-1234-123456789012",
    mp_webhook_secret: "a1".repeat(32),
  };

  it("valores válidos; vacíos = mantener", () => {
    expect(parsearMp(fd(MP))).toEqual({
      ok: true,
      valor: { accessToken: MP.mp_access_token, publicKey: MP.mp_public_key, webhookSecret: MP.mp_webhook_secret },
    });
    expect(parsearMp(fd({ mp_access_token: "TEST-abcdef123456" }))).toEqual({
      ok: true,
      valor: { accessToken: "TEST-abcdef123456", publicKey: null, webhookSecret: null },
    });
  });

  it("cada error", () => {
    expect(parsearMp(fd({ ...MP, mp_access_token: "hola" }))).toEqual({ ok: false, error: "mp_access_token" });
    expect(parsearMp(fd({ ...MP, mp_access_token: `Bearer ${MP.mp_access_token}` }))).toEqual({ ok: false, error: "mp_access_token" });
    expect(parsearMp(fd({ ...MP, mp_public_key: "xx" }))).toEqual({ ok: false, error: "mp_public_key" });
    expect(parsearMp(fd({ ...MP, mp_webhook_secret: "corto" }))).toEqual({ ok: false, error: "mp_webhook_secret" });
  });
});

import { describe, it, expect } from "vitest";
import {
  ESPERA_REENVIO_MS,
  MAX_CODIGOS_POR_HORA,
  MAX_INTENTOS,
  VIGENCIA_CODIGO_MS,
  estadoCodigo,
  generarCodigo,
  hashCodigo,
  mismoHash,
  normalizarCodigo,
  permisoEnvio,
  vencimientoCodigo,
} from "./codigos";

const SECRETO = "s".repeat(43);
const AHORA = new Date("2026-10-12T15:00:00Z");
const segundosAntes = (s: number) => new Date(AHORA.getTime() - s * 1000);

describe("constantes del spec", () => {
  it("10 minutos, 5 intentos, reenvío a los 60 s y 5 códigos por hora", () => {
    expect(VIGENCIA_CODIGO_MS).toBe(10 * 60 * 1000);
    expect(MAX_INTENTOS).toBe(5);
    expect(ESPERA_REENVIO_MS).toBe(60 * 1000);
    expect(MAX_CODIGOS_POR_HORA).toBe(5);
  });
});

describe("generarCodigo", () => {
  it("son siempre 6 dígitos (con ceros a la izquierda)", () => {
    for (let i = 0; i < 500; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });

  it("no se repite", () => {
    const codigos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(codigos.size).toBeGreaterThan(45);
  });
});

describe("normalizarCodigo", () => {
  it("acepta espacios y guiones", () => {
    expect(normalizarCodigo("123456")).toBe("123456");
    expect(normalizarCodigo(" 123 456 ")).toBe("123456");
    expect(normalizarCodigo("123-456")).toBe("123456");
  });

  it("rechaza lo que no son 6 dígitos", () => {
    expect(normalizarCodigo("12345")).toBeNull();
    expect(normalizarCodigo("1234567")).toBeNull();
    expect(normalizarCodigo("12a456")).toBeNull();
    expect(normalizarCodigo("")).toBeNull();
  });
});

describe("hashCodigo", () => {
  it("es determinístico y no contiene el código", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(h).toBe(hashCodigo(SECRETO, "user-1", "123456"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("123456");
  });

  it("depende del usuario y del secreto", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(hashCodigo(SECRETO, "user-2", "123456")).not.toBe(h);
    expect(hashCodigo("t".repeat(43), "user-1", "123456")).not.toBe(h);
  });
});

describe("mismoHash", () => {
  it("compara en tiempo constante, también con largos distintos", () => {
    const h = hashCodigo(SECRETO, "user-1", "123456");
    expect(mismoHash(h, h)).toBe(true);
    expect(mismoHash(h, hashCodigo(SECRETO, "user-1", "654321"))).toBe(false);
    expect(mismoHash(h, h.slice(0, 10))).toBe(false);
  });
});

describe("estadoCodigo", () => {
  const vigente = { expira_en: new Date(AHORA.getTime() + 60_000).toISOString(), intentos: 0, usado_en: null };

  it("vigente mientras no venza, no se agoten los intentos ni se use", () => {
    expect(estadoCodigo(vigente, AHORA)).toBe("vigente");
    expect(estadoCodigo({ ...vigente, intentos: MAX_INTENTOS - 1 }, AHORA)).toBe("vigente");
  });

  it("vencido al llegar a expira_en", () => {
    expect(estadoCodigo({ ...vigente, expira_en: AHORA.toISOString() }, AHORA)).toBe("vencido");
  });

  it("agotado con 5 intentos", () => {
    expect(estadoCodigo({ ...vigente, intentos: MAX_INTENTOS }, AHORA)).toBe("agotado");
  });

  it("usado gana a todo lo demás", () => {
    expect(
      estadoCodigo({ expira_en: AHORA.toISOString(), intentos: MAX_INTENTOS, usado_en: AHORA.toISOString() }, AHORA),
    ).toBe("usado");
  });
});

describe("permisoEnvio", () => {
  it("permite el primero", () => {
    expect(permisoEnvio(null, 0, AHORA)).toEqual({ ok: true });
  });

  it("pide esperar hasta 60 s desde el último", () => {
    expect(permisoEnvio(segundosAntes(30), 1, AHORA)).toEqual({ ok: false, motivo: "espera", segundos: 30 });
    expect(permisoEnvio(segundosAntes(60), 1, AHORA)).toEqual({ ok: true });
  });

  it("corta en 5 códigos por hora", () => {
    expect(permisoEnvio(segundosAntes(600), MAX_CODIGOS_POR_HORA - 1, AHORA)).toEqual({ ok: true });
    expect(permisoEnvio(segundosAntes(600), MAX_CODIGOS_POR_HORA, AHORA)).toEqual({ ok: false, motivo: "limite" });
  });
});

describe("vencimientoCodigo", () => {
  it("es 10 minutos después", () => {
    expect(vencimientoCodigo(AHORA).toISOString()).toBe("2026-10-12T15:10:00.000Z");
  });
});

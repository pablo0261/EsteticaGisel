import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrar, claveDesdeTexto, descifrar, type ContextoCifrado } from "./credenciales";

const CLAVE = randomBytes(32);
const CTX: ContextoCifrado = { tenantId: "11111111-1111-1111-1111-111111111111", columna: "mp_access_token" };
const FORMATO = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Cambia un bit del primer byte de una de las partes (1 = iv, 2 = tag, 3 = cifrado). */
function alterar(valor: string, parte: number): string {
  const partes = valor.split(".");
  const bytes = Buffer.from(partes[parte], "base64url");
  bytes[0] ^= 0x01;
  partes[parte] = bytes.toString("base64url");
  return partes.join(".");
}

describe("claveDesdeTexto", () => {
  it("acepta 32 bytes en base64url", () => {
    const texto = randomBytes(32).toString("base64url");
    expect(claveDesdeTexto(texto).length).toBe(32);
    expect(claveDesdeTexto(` ${texto} `).length).toBe(32);
  });

  it("rechaza ausente, corta, larga o con caracteres inválidos", () => {
    expect(() => claveDesdeTexto(undefined)).toThrow();
    expect(() => claveDesdeTexto("")).toThrow();
    expect(() => claveDesdeTexto(randomBytes(16).toString("base64url"))).toThrow();
    expect(() => claveDesdeTexto(randomBytes(48).toString("base64url"))).toThrow();
    expect(() => claveDesdeTexto(`${randomBytes(30).toString("base64url")}+/=`)).toThrow();
  });
});

describe("cifrar y descifrar", () => {
  it("ida y vuelta, también con acentos y emojis", () => {
    for (const texto of ["APP_USR-123", "contraseña ñandú 🔐", "a"]) {
      expect(descifrar(CLAVE, cifrar(CLAVE, texto, CTX), CTX)).toBe(texto);
    }
  });

  it("formato v1.<iv>.<tag>.<cifrado> en base64url, sin el texto en claro", () => {
    const valor = cifrar(CLAVE, "APP_USR-secreto", CTX);
    expect(valor).toMatch(FORMATO);
    expect(valor).not.toContain("secreto");
    const [, iv, tag] = valor.split(".");
    expect(Buffer.from(iv, "base64url").length).toBe(12);
    expect(Buffer.from(tag, "base64url").length).toBe(16);
  });

  it("dos cifrados del mismo texto son distintos (IV aleatorio)", () => {
    expect(cifrar(CLAVE, "igual", CTX)).not.toBe(cifrar(CLAVE, "igual", CTX));
  });

  it("no se descifra con otro tenant ni con otra columna (AAD)", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    expect(() => descifrar(CLAVE, valor, { ...CTX, tenantId: "22222222-2222-2222-2222-222222222222" })).toThrow();
    expect(() => descifrar(CLAVE, valor, { ...CTX, columna: "smtp_password" })).toThrow();
  });

  it("no se descifra con otra clave", () => {
    expect(() => descifrar(randomBytes(32), cifrar(CLAVE, "secreto", CTX), CTX)).toThrow();
  });

  it("detecta cualquier alteración del iv, el tag o el cifrado", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    for (const parte of [1, 2, 3]) expect(() => descifrar(CLAVE, alterar(valor, parte), CTX)).toThrow();
  });

  it("rechaza formatos desconocidos", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    expect(() => descifrar(CLAVE, valor.replace(/^v1\./, "v2."), CTX)).toThrow();
    expect(() => descifrar(CLAVE, "secreto-en-claro", CTX)).toThrow();
    expect(() => descifrar(CLAVE, valor.split(".").slice(0, 3).join("."), CTX)).toThrow();
  });

  it("rechaza un tag bien formado pero de largo incorrecto, un cifrado truncado y acepta el texto vacío", () => {
    const valor = cifrar(CLAVE, "secreto", CTX);
    const partes = valor.split(".");
    const tagCorto = [...partes];
    tagCorto[2] = Buffer.alloc(12).toString("base64url");
    expect(() => descifrar(CLAVE, tagCorto.join("."), CTX)).toThrow();
    const truncado = [...partes];
    truncado[3] = partes[3].slice(0, -1);
    expect(() => descifrar(CLAVE, truncado.join("."), CTX)).toThrow();
    expect(descifrar(CLAVE, cifrar(CLAVE, "", CTX), CTX)).toBe("");
  });

  it("rechaza una clave que no es de 32 bytes", () => {
    expect(() => cifrar(randomBytes(16), "x", CTX)).toThrow();
  });
});

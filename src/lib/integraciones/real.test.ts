import { describe, expect, it } from "vitest";
import { esCredencialUsable } from "./real";

describe("esCredencialUsable", () => {
  it("rechaza vacío, xxx y los ejemplos del .env", () => {
    expect(esCredencialUsable(undefined)).toBe(false);
    expect(esCredencialUsable("")).toBe(false);
    expect(esCredencialUsable("xxx")).toBe(false);
    expect(esCredencialUsable("TEST-xxx")).toBe(false);
    expect(esCredencialUsable("xxx.apps.googleusercontent.com")).toBe(false);
    expect(esCredencialUsable("cambiar-por-un-valor-largo-y-aleatorio")).toBe(false);
  });

  it("acepta un token de prueba real y un access token de producción", () => {
    expect(esCredencialUsable("TEST-1234567890abcdef")).toBe(true);
    expect(esCredencialUsable("APP_USR-1234567890abcdef")).toBe(true);
  });
});

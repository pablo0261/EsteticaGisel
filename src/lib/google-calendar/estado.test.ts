import { describe, expect, it } from "vitest";
import { crearEstadoOauth, leerEstadoOauth } from "./estado";

const SECRETO = "a".repeat(43);
const TENANT = "11111111-1111-4111-8111-111111111111";
const AHORA = 1_700_000_000_000;

describe("estado OAuth de Google", () => {
  it("devuelve el tenant mientras no venza", () => {
    const estado = crearEstadoOauth(SECRETO, TENANT, AHORA);
    expect(leerEstadoOauth(SECRETO, estado, AHORA + 1000)).toBe(TENANT);
  });

  it("rechaza vencido, otro secreto, otro tenant o un valor alterado", () => {
    const estado = crearEstadoOauth(SECRETO, TENANT, AHORA);
    expect(leerEstadoOauth(SECRETO, estado, AHORA + 11 * 60 * 1000)).toBeNull();
    expect(leerEstadoOauth("b".repeat(43), estado, AHORA)).toBeNull();
    expect(leerEstadoOauth(SECRETO, `${estado}x`, AHORA)).toBeNull();
    expect(leerEstadoOauth(SECRETO, "no-es-un-estado", AHORA)).toBeNull();
  });
});

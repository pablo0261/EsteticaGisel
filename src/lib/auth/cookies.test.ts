import { describe, it, expect } from "vitest";
import { DURACION_COOKIE_S, opcionesCookieAuth } from "./cookies";

describe("opcionesCookieAuth", () => {
  it("httpOnly, SameSite=Lax y path /", () => {
    expect(opcionesCookieAuth("http", 60)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
  });

  it("Secure solo con https", () => {
    expect(opcionesCookieAuth("https", 60).secure).toBe(true);
  });

  it("Secure salvo que sea explícitamente http (falla seguro)", () => {
    expect(opcionesCookieAuth("HTTPS", 60).secure).toBe(true);
    expect(opcionesCookieAuth("http", 60).secure).toBe(false);
    expect(opcionesCookieAuth("HTTP", 60).secure).toBe(false);
  });

  it("las cookies de auth duran 30 días", () => {
    expect(DURACION_COOKIE_S).toBe(2_592_000);
  });
});

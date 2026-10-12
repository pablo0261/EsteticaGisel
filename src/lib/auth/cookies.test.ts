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

  it("las cookies de auth duran 30 días", () => {
    expect(DURACION_COOKIE_S).toBe(2_592_000);
  });
});

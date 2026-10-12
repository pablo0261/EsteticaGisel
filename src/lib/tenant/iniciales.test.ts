import { describe, it, expect } from "vitest";
import { iniciales } from "./iniciales";

describe("iniciales", () => {
  it("toma la inicial de cada palabra en mayúscula", () => {
    expect(iniciales("Gisel Bigurrarena")).toBe("GB");
  });

  it("funciona con una sola palabra en minúscula", () => {
    expect(iniciales("ana")).toBe("A");
  });

  it("ignora los espacios de más", () => {
    expect(iniciales("  Gisel   Bigurrarena  ")).toBe("GB");
  });

  it("con tres palabras usa solo las dos primeras", () => {
    expect(iniciales("María Laura Pérez")).toBe("ML");
  });
});

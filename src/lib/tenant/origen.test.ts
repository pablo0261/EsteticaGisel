import { describe, expect, it } from "vitest";
import { origenPublico } from "./origen";

const base = {
  protocol: "http:",
  dominio: "localhost:3001",
  fallback: "http://localhost:3001",
};

describe("origenPublico", () => {
  it("conserva el subdominio del host", () => {
    expect(origenPublico({ ...base, host: "gisel.localhost:3001" })).toBe("http://gisel.localhost:3001");
  });

  it("no redirige a un host ajeno aunque haya tenant por defecto", () => {
    expect(
      origenPublico({
        ...base,
        host: "evil.example",
        tenantPorDefecto: "gisel",
      }),
    ).toBe("http://localhost:3001");
  });

  it("rechaza un host con salto de línea", () => {
    expect(origenPublico({ ...base, host: "gisel.localhost:3001\r\nLocation: https://evil" })).toBe(
      "http://localhost:3001",
    );
  });
});

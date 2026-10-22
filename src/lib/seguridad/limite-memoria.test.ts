import { describe, expect, it } from "vitest";
import { consumoPermitido, permitirPorIpOGlobal, reiniciarLimites } from "./limite-memoria";

describe("consumoPermitido", () => {
  it("corta al superar el cupo y vuelve a abrir en la ventana siguiente", () => {
    reiniciarLimites();
    const clave = "webhook-test";
    expect(consumoPermitido(clave, 2, 1000, 0)).toBe(true);
    expect(consumoPermitido(clave, 2, 1000, 10)).toBe(true);
    expect(consumoPermitido(clave, 2, 1000, 20)).toBe(false);
    expect(consumoPermitido(clave, 2, 1000, 1000)).toBe(true);
  });

  it("una clave no gasta el cupo de otra", () => {
    reiniciarLimites();
    expect(consumoPermitido("a", 1, 1000, 0)).toBe(true);
    expect(consumoPermitido("a", 1, 1000, 1)).toBe(false);
    expect(consumoPermitido("b", 1, 1000, 1)).toBe(true);
  });
});

describe("permitirPorIpOGlobal", () => {
  it("separa por IP y no mezcla a quien no tiene IP con esas IP", () => {
    reiniciarLimites();
    const opts = { porIp: 1, sinIp: 1, ventanaMs: 1000 };
    expect(permitirPorIpOGlobal("compra", "1.1.1.1", opts, 0)).toBe(true);
    expect(permitirPorIpOGlobal("compra", "1.1.1.1", opts, 1)).toBe(false);
    expect(permitirPorIpOGlobal("compra", "2.2.2.2", opts, 1)).toBe(true);
    expect(permitirPorIpOGlobal("compra", null, opts, 1)).toBe(true);
    expect(permitirPorIpOGlobal("compra", null, opts, 2)).toBe(false);
  });
});

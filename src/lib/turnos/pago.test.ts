import { describe, it, expect } from "vitest";
import { cobroDeReserva, detalleCobro, esModoPago, MODOS_PAGO, NOMBRE_MODO_PAGO, textoModoPago } from "./pago";

describe("esModoPago", () => {
  it("acepta los tres modos y nada más", () => {
    expect(MODOS_PAGO).toEqual(["ninguno", "sena", "total"]);
    for (const m of MODOS_PAGO) expect(esModoPago(m), m).toBe(true);
    for (const m of ["", "SENA", "gratis", null, undefined, 1]) expect(esModoPago(m), String(m)).toBe(false);
  });
});

describe("cobroDeReserva", () => {
  it("sin pago anticipado: no se cobra nada", () => {
    expect(cobroDeReserva("ninguno", 50, [1000, 2000])).toEqual({ tipo: "sin_cobro" });
  });

  it("seña: el porcentaje de cada servicio, redondeado como hoy", () => {
    expect(cobroDeReserva("sena", 50, [1000, 3001])).toEqual({ tipo: "cobro", montos: [500, 1501], total: 2001 });
    expect(cobroDeReserva("sena", 30, [0, 1000])).toEqual({ tipo: "cobro", montos: [0, 300], total: 300 });
  });

  it("pago total: el precio de cada servicio, con centavos", () => {
    expect(cobroDeReserva("total", 50, [1000, 250.5])).toEqual({ tipo: "cobro", montos: [1000, 250.5], total: 1250.5 });
  });

  it("con pago y nada para cobrar (servicios a consultar): sin_precio", () => {
    expect(cobroDeReserva("sena", 50, [0])).toEqual({ tipo: "sin_precio" });
    expect(cobroDeReserva("total", 50, [0, 0])).toEqual({ tipo: "sin_precio" });
  });
});

describe("textos de cada modo", () => {
  it("nombre y texto del sitio en los dos idiomas", () => {
    expect(NOMBRE_MODO_PAGO.ninguno).toEqual({ es: "Sin pago anticipado", pt: "Sem pagamento antecipado" });
    expect(textoModoPago("sena", 30).es).toContain("30%");
    expect(textoModoPago("sena", 30).pt).toContain("30%");
    expect(textoModoPago("ninguno", 30).pt).toContain("Sem pagamento antecipado");
    expect(textoModoPago("total", 30).es).toContain("precio total");
  });

  it("el detalle del cobro incluye el monto", () => {
    expect(detalleCobro("sena", "$ 1.000").es).toContain("$ 1.000");
    expect(detalleCobro("total", "R$ 350,00").pt).toContain("R$ 350,00");
  });
});

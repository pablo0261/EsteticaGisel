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
    expect(cobroDeReserva("ninguno", 50, [1000, 2000], "ARS")).toEqual({ tipo: "sin_cobro" });
  });

  it("seña: el porcentaje de cada servicio, redondeado al peso en ARS", () => {
    expect(cobroDeReserva("sena", 50, [1000, 3001], "ARS")).toEqual({ tipo: "cobro", montos: [500, 1501], total: 2001 });
    expect(cobroDeReserva("sena", 30, [0, 1000], "ARS")).toEqual({ tipo: "cobro", montos: [0, 300], total: 300 });
    expect(cobroDeReserva("sena", 50, [35000], "ARS")).toEqual({ tipo: "cobro", montos: [17500], total: 17500 });
  });

  it("seña en BRL: redondeada al centavo, no al real", () => {
    expect(cobroDeReserva("sena", 50, [0.8], "BRL")).toEqual({ tipo: "cobro", montos: [0.4], total: 0.4 });
    expect(cobroDeReserva("sena", 30, [99.99], "BRL")).toEqual({ tipo: "cobro", montos: [30], total: 30 });
  });

  it("pago total: el precio de cada servicio, exacto en la moneda", () => {
    expect(cobroDeReserva("total", 50, [1000, 250.5], "BRL")).toEqual({ tipo: "cobro", montos: [1000, 250.5], total: 1250.5 });
    expect(cobroDeReserva("total", 50, [10.1, 20.2], "BRL")).toEqual({ tipo: "cobro", montos: [10.1, 20.2], total: 30.3 });
    expect(cobroDeReserva("total", 50, [1000.4, 2000], "ARS")).toEqual({ tipo: "cobro", montos: [1000, 2000], total: 3000 });
  });

  it("suma en centavos enteros: el total es la suma exacta de los montos", () => {
    expect(cobroDeReserva("sena", 50, [10.01, 0.29], "BRL")).toEqual({ tipo: "cobro", montos: [5.01, 0.15], total: 5.16 });
    expect(cobroDeReserva("sena", 70, [45, 45], "ARS")).toEqual({ tipo: "cobro", montos: [32, 32], total: 64 });
    expect(cobroDeReserva("total", 50, [0.1, 0.2, 1.005], "BRL")).toEqual({ tipo: "cobro", montos: [0.1, 0.2, 1.01], total: 1.31 });
  });

  it("con pago y nada para cobrar (servicios a consultar): sin_precio", () => {
    expect(cobroDeReserva("sena", 50, [0], "ARS")).toEqual({ tipo: "sin_precio" });
    expect(cobroDeReserva("total", 50, [0, 0], "BRL")).toEqual({ tipo: "sin_precio" });
    // En ARS una seña de menos de medio peso redondea a 0.
    expect(cobroDeReserva("sena", 50, [0.8], "ARS")).toEqual({ tipo: "sin_precio" });
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

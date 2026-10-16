import { describe, it, expect } from "vitest";
import { montoDeCompraValido, parsearReferencia, referenciaCurso } from "./referencia";

const ID = "6f1c1c3e-2b7a-4b8e-9a51-0c2d6c7b9e10";
const ID2 = "0b9e4a55-8f41-4c1e-a7d2-3c5b7d9e1f20";

describe("referenciaCurso", () => {
  it("lleva el id del curso y el monto cobrado en centavos de la moneda", () => {
    expect(referenciaCurso(ID, 1500, "ARS")).toBe(`curso:${ID}:150000`);
    expect(referenciaCurso(ID, 99.9, "BRL")).toBe(`curso:${ID}:9990`);
  });
});

describe("parsearReferencia", () => {
  it("una reserva de turnos con uno o más ids", () => {
    expect(parsearReferencia(`turno:${ID}`)).toEqual({ tipo: "turno", ids: [ID] });
    expect(parsearReferencia(`turno:${ID},${ID2}`)).toEqual({ tipo: "turno", ids: [ID, ID2] });
  });

  it("una compra de curso con el monto esperado (formato nuevo)", () => {
    expect(parsearReferencia(`curso:${ID}:150000`)).toEqual({ tipo: "curso", id: ID, centavos: 150000 });
  });

  it("una compra de curso sin monto (formato anterior)", () => {
    expect(parsearReferencia(`curso:${ID}`)).toEqual({ tipo: "curso", id: ID, centavos: null });
  });

  it("null para lo que no reconoce", () => {
    for (const ref of [null, "", "turno:", "curso:", "otro:x", `curso:${ID}:`, `curso:${ID}:-5`, `curso:${ID}:1.5`, `curso:${ID}:12:3`, `turno:${ID},`]) {
      expect(parsearReferencia(ref), String(ref)).toBeNull();
    }
  });
});

describe("montoDeCompraValido", () => {
  const curso = { precio: 20000, precioOferta: 15000 as number | null, moneda: "ARS" as const };

  it("acepta lo pagado si es el monto de la referencia y ese monto es el precio o el de oferta", () => {
    expect(montoDeCompraValido({ ...curso, pagado: 15000, centavosEsperados: 1500000 })).toBe(true);
    expect(montoDeCompraValido({ ...curso, pagado: 20000, centavosEsperados: 2000000 })).toBe(true);
  });

  it("rechaza si lo pagado no es el monto de la referencia", () => {
    expect(montoDeCompraValido({ ...curso, pagado: 15000, centavosEsperados: 2000000 })).toBe(false);
  });

  it("rechaza un monto de referencia que no es ningún precio del curso", () => {
    expect(montoDeCompraValido({ ...curso, pagado: 100, centavosEsperados: 10000 })).toBe(false);
    expect(montoDeCompraValido({ ...curso, precioOferta: null, pagado: 15000, centavosEsperados: 1500000 })).toBe(false);
  });

  it("compara en centavos (BRL con centavos)", () => {
    expect(montoDeCompraValido({ precio: 99.9, precioOferta: null, moneda: "BRL", pagado: 99.9, centavosEsperados: 9990 })).toBe(true);
    expect(montoDeCompraValido({ precio: 99.9, precioOferta: null, moneda: "BRL", pagado: 99.89, centavosEsperados: 9990 })).toBe(false);
  });
});

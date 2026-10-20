import { describe, expect, it } from "vitest";
import { esDestinoPermitido, esUrlDeMercadoPago } from "./destino";

describe("esUrlDeMercadoPago", () => {
  it("acepta el checkout https de Mercado Pago", () => {
    expect(esUrlDeMercadoPago("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1")).toBe(true);
    expect(esUrlDeMercadoPago("https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=1")).toBe(true);
    expect(esUrlDeMercadoPago("https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1")).toBe(true);
  });

  it("rechaza http, otro dominio y un sufijo falso", () => {
    expect(esUrlDeMercadoPago("http://www.mercadopago.com.ar/checkout")).toBe(false);
    expect(esUrlDeMercadoPago("https://evil.com/checkout")).toBe(false);
    expect(esUrlDeMercadoPago("https://mercadopago.com.ar.evil.com/checkout")).toBe(false);
    expect(esUrlDeMercadoPago("https://notmercadopago.com/checkout")).toBe(false);
    expect(esUrlDeMercadoPago("no es una url")).toBe(false);
  });
});

describe("esDestinoPermitido", () => {
  it("permite una ruta del sitio y el checkout", () => {
    expect(esDestinoPermitido("/turnos/gracias?turno=1")).toBe(true);
    expect(esDestinoPermitido("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1")).toBe(true);
  });

  it("rechaza un protocolo relativo y un dominio ajeno", () => {
    expect(esDestinoPermitido("//evil.com")).toBe(false);
    expect(esDestinoPermitido("https://evil.com")).toBe(false);
  });
});

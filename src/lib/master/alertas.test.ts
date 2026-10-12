import { describe, it, expect } from "vitest";
import { alertasDelCliente, TEXTO_ALERTA } from "./alertas";

const AHORA = new Date("2026-10-12T12:00:00Z");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000).toISOString();

describe("alertasDelCliente", () => {
  it("sin credenciales o todo en orden: ninguna", () => {
    expect(alertasDelCliente(null, AHORA)).toEqual([]);
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: null }, AHORA)).toEqual([]);
    expect(alertasDelCliente({ smtpEstado: "sin_configurar", mpTokenVenceEn: enDias(40) }, AHORA)).toEqual([]);
  });

  it("email con error", () => {
    expect(alertasDelCliente({ smtpEstado: "error", mpTokenVenceEn: null }, AHORA)).toEqual(["email_error"]);
  });

  it("Mercado Pago por vencer (menos de 30 días) o vencido", () => {
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: enDias(10) }, AHORA)).toEqual(["mp_por_vencer"]);
    expect(alertasDelCliente({ smtpEstado: "ok", mpTokenVenceEn: enDias(-1) }, AHORA)).toEqual(["mp_vencido"]);
    expect(alertasDelCliente({ smtpEstado: "error", mpTokenVenceEn: enDias(0) }, AHORA)).toEqual(["email_error", "mp_vencido"]);
  });

  it("cada alerta tiene su texto", () => {
    for (const a of ["email_error", "mp_vencido", "mp_por_vencer"] as const) expect(TEXTO_ALERTA[a]).toBeTruthy();
  });
});

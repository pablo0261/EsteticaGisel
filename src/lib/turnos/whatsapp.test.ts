import { describe, it, expect } from "vitest";
import { normalizarWhatsApp } from "./whatsapp";

describe("normalizarWhatsApp", () => {
  it("acepta celular con 15 y lo normaliza al formato internacional de WhatsApp", () => {
    expect(normalizarWhatsApp("011 15 2345-6789")).toBe("+5491123456789");
  });

  it("acepta celular sin 0 ni 15 (como lo escribe la mayoría)", () => {
    expect(normalizarWhatsApp("11 2345 6789")).toBe("+5491123456789");
  });

  it("acepta celular del interior", () => {
    expect(normalizarWhatsApp("0351 15 612-3456")).toBe("+5493516123456");
  });

  it("acepta el formato internacional con y sin el 9", () => {
    expect(normalizarWhatsApp("+54 9 11 2345-6789")).toBe("+5491123456789");
    expect(normalizarWhatsApp("+54 11 2345 6789")).toBe("+5491123456789");
  });

  it("acepta números de otros países", () => {
    expect(normalizarWhatsApp("+34 612 345 678")).toBe("+34612345678");
  });

  it("rechaza números incompletos o inválidos", () => {
    expect(normalizarWhatsApp("2345-6789")).toBeNull();
    expect(normalizarWhatsApp("123")).toBeNull();
    expect(normalizarWhatsApp("hola")).toBeNull();
    expect(normalizarWhatsApp("")).toBeNull();
  });
});

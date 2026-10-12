import { describe, it, expect } from "vitest";
import { normalizarWhatsApp } from "./whatsapp";

describe("normalizarWhatsApp en Argentina", () => {
  it("acepta celular con 15 y lo normaliza al formato internacional de WhatsApp", () => {
    expect(normalizarWhatsApp("011 15 2345-6789", "AR")).toBe("+5491123456789");
  });

  it("acepta celular sin 0 ni 15 (como lo escribe la mayoría)", () => {
    expect(normalizarWhatsApp("11 2345 6789", "AR")).toBe("+5491123456789");
  });

  it("acepta celular del interior", () => {
    expect(normalizarWhatsApp("0351 15 612-3456", "AR")).toBe("+5493516123456");
  });

  it("acepta el formato internacional con y sin el 9", () => {
    expect(normalizarWhatsApp("+54 9 11 2345-6789", "AR")).toBe("+5491123456789");
    expect(normalizarWhatsApp("+54 11 2345 6789", "AR")).toBe("+5491123456789");
  });

  it("acepta números de otros países", () => {
    expect(normalizarWhatsApp("+34 612 345 678", "AR")).toBe("+34612345678");
  });

  it("rechaza números incompletos o inválidos", () => {
    expect(normalizarWhatsApp("2345-6789", "AR")).toBeNull();
    expect(normalizarWhatsApp("123", "AR")).toBeNull();
    expect(normalizarWhatsApp("hola", "AR")).toBeNull();
    expect(normalizarWhatsApp("", "AR")).toBeNull();
  });
});

describe("normalizarWhatsApp en Brasil", () => {
  it("acepta celulares en los formatos habituales", () => {
    expect(normalizarWhatsApp("(11) 91234-5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("11 91234 5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("+55 11 91234-5678", "BR")).toBe("+5511912345678");
    expect(normalizarWhatsApp("(21) 98765-4321", "BR")).toBe("+5521987654321");
  });

  it("rechaza teléfonos fijos", () => {
    expect(normalizarWhatsApp("(11) 3456-7890", "BR")).toBeNull();
    expect(normalizarWhatsApp("+55 11 3456-7890", "AR")).toBeNull();
  });

  it("rechaza números sin DDD o inválidos", () => {
    expect(normalizarWhatsApp("91234-5678", "BR")).toBeNull();
    expect(normalizarWhatsApp("123", "BR")).toBeNull();
    expect(normalizarWhatsApp("hola", "BR")).toBeNull();
    expect(normalizarWhatsApp("", "BR")).toBeNull();
  });

  it("acepta un celular argentino en formato internacional", () => {
    expect(normalizarWhatsApp("+54 9 11 2345-6789", "BR")).toBe("+5491123456789");
  });
});

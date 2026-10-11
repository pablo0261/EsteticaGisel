import { describe, it, expect } from "vitest";
import { mapearTenant, type FilaTenant } from "./mapear";

const marca = {
  color_primario: "#c0899a",
  color_secundario: "#4e5340",
  color_fondo: "#f6f1ea",
  color_texto: "#1a1a1a",
  logo_url: "/brand/horizontal-negro.png",
  logo_claro_url: null,
  foto_perfil_url: "/gisel/retrato.jpg",
  rubro: "Estética y Salud",
  tagline: null,
  inicio_titulo: "Tu momento de",
  inicio_destacado: "belleza",
  inicio_texto: null,
  sobre_mi_titulo: "Hola",
  sobre_mi_texto: null,
  nota_reservas: null,
  whatsapp: "+5491123456789",
  instagram: "gisel",
  email_contacto: null,
  direccion: null,
};

const fila: FilaTenant = {
  id: "T1",
  slug: "gisel",
  nombre: "Gisel",
  estado: "activo",
  idioma: "es",
  pais: "AR",
  zona_horaria: "America/Argentina/Buenos_Aires",
  moneda: "ARS",
  modulo_turnos: true,
  modulo_cursos: false,
  modulo_sobre_mi: true,
  modulo_testimonios: true,
  modulo_galeria: false,
  modulo_faq: false,
  modulo_whatsapp: false,
  tenant_marca: marca,
};

describe("mapearTenant", () => {
  it("convierte la fila de la base al tipo Tenant", () => {
    const t = mapearTenant(fila);
    expect(t.slug).toBe("gisel");
    expect(t.zonaHoraria).toBe("America/Argentina/Buenos_Aires");
    expect(t.modulos).toEqual({
      turnos: true,
      cursos: false,
      sobreMi: true,
      testimonios: true,
      galeria: false,
      faq: false,
      whatsapp: false,
    });
    expect(t.marca.inicioDestacado).toBe("belleza");
    expect(t.marca.logoClaroUrl).toBeNull();
  });

  it("acepta la marca embebida como arreglo", () => {
    expect(mapearTenant({ ...fila, tenant_marca: [marca] }).marca.rubro).toBe("Estética y Salud");
  });

  it("falla si el tenant no tiene marca", () => {
    expect(() => mapearTenant({ ...fila, tenant_marca: null })).toThrow("gisel");
  });
});

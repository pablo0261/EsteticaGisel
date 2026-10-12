import type { Idioma } from "@/lib/i18n/textos";

export type { Idioma };
export type Pais = "AR" | "BR";
export type Moneda = "ARS" | "BRL";

export type Modulos = {
  turnos: boolean;
  cursos: boolean;
  sobreMi: boolean;
  testimonios: boolean;
  galeria: boolean;
  faq: boolean;
  whatsapp: boolean;
};

export type Marca = {
  colorPrimario: string;
  colorSecundario: string;
  colorFondo: string;
  colorTexto: string;
  logoUrl: string | null;
  logoClaroUrl: string | null;
  fotoPerfilUrl: string | null;
  rubro: string | null;
  tagline: string | null;
  inicioTitulo: string;
  inicioDestacado: string | null;
  inicioTexto: string | null;
  sobreMiTitulo: string | null;
  sobreMiTexto: string | null;
  notaReservas: string | null;
  /** E.164, ej. "+5491123456789". */
  whatsapp: string | null;
  /** Usuario sin "@". */
  instagram: string | null;
  emailContacto: string | null;
  direccion: string | null;
};

export type Tenant = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "suspendido";
  idioma: Idioma;
  pais: Pais;
  zonaHoraria: string;
  moneda: Moneda;
  modulos: Modulos;
  marca: Marca;
};

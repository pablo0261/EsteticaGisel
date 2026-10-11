import type { Idioma, Marca, Moneda, Pais, Tenant } from "./tipos";

export type FilaMarca = {
  color_primario: string;
  color_secundario: string;
  color_fondo: string;
  color_texto: string;
  logo_url: string | null;
  logo_claro_url: string | null;
  foto_perfil_url: string | null;
  rubro: string | null;
  tagline: string | null;
  inicio_titulo: string;
  inicio_destacado: string | null;
  inicio_texto: string | null;
  sobre_mi_titulo: string | null;
  sobre_mi_texto: string | null;
  nota_reservas: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email_contacto: string | null;
  direccion: string | null;
};

export type FilaTenant = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "suspendido";
  idioma: Idioma;
  pais: Pais;
  zona_horaria: string;
  moneda: Moneda;
  modulo_turnos: boolean;
  modulo_cursos: boolean;
  modulo_sobre_mi: boolean;
  modulo_testimonios: boolean;
  modulo_galeria: boolean;
  modulo_faq: boolean;
  modulo_whatsapp: boolean;
  /** PostgREST lo devuelve como objeto (relación 1 a 1), o como arreglo según el embed. */
  tenant_marca: FilaMarca | FilaMarca[] | null;
};

function mapearMarca(m: FilaMarca): Marca {
  return {
    colorPrimario: m.color_primario,
    colorSecundario: m.color_secundario,
    colorFondo: m.color_fondo,
    colorTexto: m.color_texto,
    logoUrl: m.logo_url,
    logoClaroUrl: m.logo_claro_url,
    fotoPerfilUrl: m.foto_perfil_url,
    rubro: m.rubro,
    tagline: m.tagline,
    inicioTitulo: m.inicio_titulo,
    inicioDestacado: m.inicio_destacado,
    inicioTexto: m.inicio_texto,
    sobreMiTitulo: m.sobre_mi_titulo,
    sobreMiTexto: m.sobre_mi_texto,
    notaReservas: m.nota_reservas,
    whatsapp: m.whatsapp,
    instagram: m.instagram,
    emailContacto: m.email_contacto,
    direccion: m.direccion,
  };
}

/** Fila de `tenants` con su `tenant_marca` embebida → Tenant. */
export function mapearTenant(fila: FilaTenant): Tenant {
  const marca = Array.isArray(fila.tenant_marca) ? fila.tenant_marca[0] : fila.tenant_marca;
  if (!marca) throw new Error(`El tenant ${fila.slug} no tiene marca cargada`);
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    estado: fila.estado,
    idioma: fila.idioma,
    pais: fila.pais,
    zonaHoraria: fila.zona_horaria,
    moneda: fila.moneda,
    modulos: {
      turnos: fila.modulo_turnos,
      cursos: fila.modulo_cursos,
      sobreMi: fila.modulo_sobre_mi,
      testimonios: fila.modulo_testimonios,
      galeria: fila.modulo_galeria,
      faq: fila.modulo_faq,
      whatsapp: fila.modulo_whatsapp,
    },
    marca: mapearMarca(marca),
  };
}

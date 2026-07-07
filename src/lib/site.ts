/**
 * Datos del negocio para la UI pública.
 * Placeholders hasta recibir el contenido real de Gisel (textos, teléfono, precios).
 */
export const SITE = {
  nombre: "Gisel Bigurrarena",
  rubro: "Estética y Salud",
  tagline: "Belleza y bienestar con mirada profesional",
  instagram: "https://instagram.com/esteticaysaludgisel",
  instagramHandle: "@esteticaysaludgisel",
  // Reemplazar por el número real (formato internacional, sin + ni espacios).
  whatsapp: "5490000000000",
  email: "hola@esteticagisel.com.ar",
  zona: "Argentina",
  horarios: [
    { dias: "Lunes a viernes", horas: "14:00 a 19:00 hs" },
    { dias: "Sábados", horas: "09:00 a 14:00 hs" },
  ],
} as const;

export type ServicioUI = {
  nombre: string;
  duracion: string;
  precio: number;
};

/** Catálogo de servicios para la landing (precio 0 => "Consultar" hasta cargarlos). */
export const SERVICIOS_UI: ServicioUI[] = [
  { nombre: "Tratamientos faciales", duracion: "1h 30min", precio: 0 },
  { nombre: "Manicuría", duracion: "1h 30min", precio: 0 },
  { nombre: "Pedicuría", duracion: "1h", precio: 0 },
  { nombre: "Pedicuría + belleza de pies", duracion: "1h 30min", precio: 0 },
  { nombre: "Masajes", duracion: "1h", precio: 0 },
  { nombre: "Tratamientos capilares", duracion: "40min", precio: 0 },
  { nombre: "Laminado de cejas", duracion: "1h", precio: 0 },
  { nombre: "Laminado + lifting de pestañas", duracion: "1h 30min", precio: 0 },
  { nombre: "Tratamientos corporales (por zona)", duracion: "1h", precio: 0 },
];

/** Construye un link de WhatsApp con mensaje pre-cargado. */
export function whatsappLink(mensaje = "¡Hola Gisel! Quería consultarte por un turno."): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

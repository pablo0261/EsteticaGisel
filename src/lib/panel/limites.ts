import { LIMITES } from "@/lib/master/limites";

/** Largos y rangos de los formularios del panel del cliente (validación, mensajes y atributos de los campos). */
export const LIMITES_PANEL = {
  nombre: 80,
  /** Los mismos que valida el master para los textos de la marca. */
  titulo: LIMITES.titulo,
  texto: LIMITES.texto,
  duracionMin: 5,
  duracionMax: 600,
  precioMax: 10_000_000,
  ordenMax: 999,
  horasCancelacionMax: 720,
  minutosEntreTurnosMax: 240,
  testimonio: 1000,
  pregunta: 300,
  respuesta: 2000,
  descripcionImagen: 200,
  /**
   * Tope de la galería, solo en la app (cuenta y después inserta): dos subidas simultáneas
   * pueden dejar 31. Se acepta: acota el espacio de Storage, no es una regla de seguridad.
   */
  imagenesGaleria: 30,
} as const;

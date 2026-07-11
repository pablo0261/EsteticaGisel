/**
 * Punto de swap para el proveedor de video. Hoy: Supabase Storage.
 * Mañana: Bunny/Cloudinary/Mux, sin tocar el resto de la app.
 */
export type VideoProvider = {
  subir(cursoId: string, archivo: Buffer, nombreArchivo: string): Promise<string>;
  urlFirmada(storagePath: string, segundos?: number): Promise<string>;
  borrar(storagePath: string): Promise<void>;
};

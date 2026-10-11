import { createAdminClient } from "@/lib/supabase/admin";
import type { VideoProvider } from "./provider";

export const BUCKET_VIDEOS = "cursos-videos";

export const supabaseVideoProvider: VideoProvider = {
  async subir(carpeta, archivo, nombreArchivo) {
    const path = `${carpeta}/${Date.now()}-${nombreArchivo}`;
    const db = createAdminClient();
    const { error } = await db.storage
      .from(BUCKET_VIDEOS)
      .upload(path, archivo, { upsert: true });
    if (error) throw new Error(`No se pudo subir el video: ${error.message}`);
    return path;
  },

  async urlFirmada(storagePath, segundos = 300) {
    const db = createAdminClient();
    const { data, error } = await db.storage
      .from(BUCKET_VIDEOS)
      .createSignedUrl(storagePath, segundos);
    if (error || !data) throw new Error(`No se pudo firmar la URL: ${error?.message}`);
    return data.signedUrl;
  },

  async borrar(storagePath) {
    const db = createAdminClient();
    await db.storage.from(BUCKET_VIDEOS).remove([storagePath]);
  },
};

import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET_ARCHIVOS = "cursos-archivos";

export async function subirArchivoCurso(
  cursoId: string,
  archivo: Buffer,
  nombreArchivo: string,
): Promise<string> {
  const path = `${cursoId}/${Date.now()}-${nombreArchivo}`;
  const db = createAdminClient();
  const { error } = await db.storage
    .from(BUCKET_ARCHIVOS)
    .upload(path, archivo, { upsert: true });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  return path;
}

export async function urlFirmadaArchivo(storagePath: string, segundos = 300): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.storage
    .from(BUCKET_ARCHIVOS)
    .createSignedUrl(storagePath, segundos);
  if (error || !data) throw new Error(`No se pudo firmar la URL: ${error?.message}`);
  return data.signedUrl;
}

export async function borrarArchivoCurso(storagePath: string): Promise<void> {
  const db = createAdminClient();
  await db.storage.from(BUCKET_ARCHIVOS).remove([storagePath]);
}

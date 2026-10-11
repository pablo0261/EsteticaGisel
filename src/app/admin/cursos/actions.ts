"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { videoProvider } from "@/lib/video";
import { subirArchivoCurso, borrarArchivoCurso } from "@/lib/storage/archivos";
import { youtubeId } from "@/lib/video/youtube";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { datosDelTenant } from "@/lib/tenant/datos";
import type { ArchivoCurso } from "@/lib/data/types";

// Límites de la versión de prueba (Supabase free tier = 1 GB de storage total).
// Subir videos en MP4/H.264 comprimido (ej. 720p) para entrar cómodo en este tope.
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB
const MAX_ARCHIVO_BYTES = 20 * 1024 * 1024; // 20 MB

function revalidar(cursoId?: string) {
  revalidatePath("/admin/cursos");
  revalidatePath("/sitio/[tenant]", "layout");
  if (cursoId) revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function createCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);

  const video = formData.get("video") as File | null;
  if (video && video.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El video pesa ${Math.round(video.size / 1024 / 1024)}MB. Por ahora el límite es 150MB (versión de prueba) — comprimilo (MP4/H.264, ej. 720p) o subilo después.`,
    );
  }

  const { data, error } = await db
    .insert("cursos", {
      titulo: String(formData.get("titulo")),
      categoria: String(formData.get("categoria")),
      precio: Number(formData.get("precio") || 0),
      dias_acceso: Number(formData.get("dias_acceso") || 7),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el curso");

  if (video && video.size > 0) {
    const buffer = Buffer.from(await video.arrayBuffer());
    const path = await videoProvider.subir(`${tenant.id}/${data.id}`, buffer, video.name);
    await db.update("cursos", { video_storage_path: path }).eq("id", data.id);
  }

  revalidar();
  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const id = String(formData.get("id"));

  const ofertaDesde = String(formData.get("oferta_desde") || "");
  const ofertaHasta = String(formData.get("oferta_hasta") || "");
  const precioOferta = String(formData.get("precio_oferta") || "");
  const previewYoutubeUrl = String(formData.get("preview_youtube_url") || "").trim();
  if (previewYoutubeUrl && !youtubeId(previewYoutubeUrl)) {
    throw new Error("El link de vista previa no es un video de YouTube válido.");
  }

  await datosDelTenant(tenant.id)
    .update("cursos", {
      titulo: String(formData.get("titulo")),
      descripcion: String(formData.get("descripcion") || "") || null,
      preview_youtube_url: previewYoutubeUrl || null,
      categoria: String(formData.get("categoria")),
      permitir_descarga: formData.get("permitir_descarga") === "on",
      dias_acceso: Number(formData.get("dias_acceso") || 7),
      precio: Number(formData.get("precio") || 0),
      precio_oferta: precioOferta ? Number(precioOferta) : null,
      oferta_activa: formData.get("oferta_activa") === "on",
      oferta_desde: ofertaDesde || null,
      oferta_hasta: ofertaHasta || null,
      estado: String(formData.get("estado")),
      orden: Number(formData.get("orden") || 0),
    })
    .eq("id", id);

  revalidar(id);
}

export async function deleteCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  await datosDelTenant(tenant.id).delete("cursos").eq("id", String(formData.get("id")));
  revalidar();
  redirect("/admin/cursos");
}

export async function subirVideoCurso(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El video pesa ${Math.round(file.size / 1024 / 1024)}MB. Por ahora el límite es 150MB (versión de prueba) — comprimilo (MP4/H.264, ej. 720p) y volvé a intentar.`,
    );
  }

  const db = datosDelTenant(tenant.id);
  const { data: curso } = await db.select("cursos", "id").eq("id", cursoId).maybeSingle();
  if (!curso) throw new Error("Curso no encontrado.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await videoProvider.subir(`${tenant.id}/${cursoId}`, buffer, file.name);
  await db.update("cursos", { video_storage_path: path }).eq("id", cursoId);
  revalidar(cursoId);
}

export async function subirArchivoAdicional(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_ARCHIVO_BYTES) {
    throw new Error(
      `El archivo pesa ${Math.round(file.size / 1024 / 1024)}MB. Por ahora el límite es 20MB.`,
    );
  }

  const db = datosDelTenant(tenant.id);
  const { data: curso } = await db.select("cursos", "id").eq("id", cursoId).maybeSingle();
  if (!curso) throw new Error("Curso no encontrado.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await subirArchivoCurso(`${tenant.id}/${cursoId}`, buffer, file.name);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const tipo = ext === "pdf" ? "pdf" : ext === "ppt" || ext === "pptx" ? "pptx" : "otro";

  await db.insert("archivos_curso", {
    curso_id: cursoId,
    nombre_archivo: file.name,
    storage_path: path,
    tipo,
  });
  revalidar(cursoId);
}

export async function eliminarArchivoAdicional(formData: FormData) {
  const tenant = await tenantDelAdmin();
  const db = datosDelTenant(tenant.id);
  const id = String(formData.get("id"));
  const cursoId = String(formData.get("cursoId"));

  // La ruta del archivo sale de la base del tenant, no del formulario.
  const { data: fila } = await db
    .select("archivos_curso", "storage_path")
    .eq("id", id)
    .maybeSingle();
  const archivo = fila as unknown as Pick<ArchivoCurso, "storage_path"> | null;
  if (!archivo) return;

  await borrarArchivoCurso(archivo.storage_path);
  await db.delete("archivos_curso").eq("id", id);
  revalidar(cursoId);
}

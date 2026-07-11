"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoProvider } from "@/lib/video";
import { subirArchivoCurso, borrarArchivoCurso } from "@/lib/storage/archivos";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
}

function revalidar(cursoId?: string) {
  revalidatePath("/admin/cursos");
  revalidatePath("/cursos");
  if (cursoId) revalidatePath(`/admin/cursos/${cursoId}`);
}

export async function createCurso(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db
    .from("cursos")
    .insert({
      titulo: String(formData.get("titulo")),
      categoria: String(formData.get("categoria")),
      precio: Number(formData.get("precio") || 0),
      dias_acceso: Number(formData.get("dias_acceso") || 7),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el curso");
  revalidar();
  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCurso(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));

  const ofertaDesde = String(formData.get("oferta_desde") || "");
  const ofertaHasta = String(formData.get("oferta_hasta") || "");
  const precioOferta = String(formData.get("precio_oferta") || "");

  await db
    .from("cursos")
    .update({
      titulo: String(formData.get("titulo")),
      descripcion: String(formData.get("descripcion") || "") || null,
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
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  await db.from("cursos").delete().eq("id", id);
  revalidar();
  redirect("/admin/cursos");
}

export async function subirVideoCurso(formData: FormData) {
  await requireAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await videoProvider.subir(cursoId, buffer, file.name);

  const db = createAdminClient();
  await db.from("cursos").update({ video_storage_path: path }).eq("id", cursoId);
  revalidar(cursoId);
}

export async function subirArchivoAdicional(formData: FormData) {
  await requireAdmin();
  const cursoId = String(formData.get("cursoId"));
  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await subirArchivoCurso(cursoId, buffer, file.name);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const tipo = ext === "pdf" ? "pdf" : ext === "ppt" || ext === "pptx" ? "pptx" : "otro";

  const db = createAdminClient();
  await db.from("archivos_curso").insert({
    curso_id: cursoId,
    nombre_archivo: file.name,
    storage_path: path,
    tipo,
  });
  revalidar(cursoId);
}

export async function eliminarArchivoAdicional(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const cursoId = String(formData.get("cursoId"));
  const storagePath = String(formData.get("storagePath"));

  await borrarArchivoCurso(storagePath);
  const db = createAdminClient();
  await db.from("archivos_curso").delete().eq("id", id);
  revalidar(cursoId);
}

import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ArchivoCurso, Curso } from "./types";

export async function getCursosPublicos(): Promise<Curso[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("cursos")
      .select("*")
      .eq("estado", "publicado")
      .order("orden");
    if (error) return [];
    return (data as Curso[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCursoPublico(id: string): Promise<Curso | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("cursos")
    .select("*")
    .eq("id", id)
    .eq("estado", "publicado")
    .single();
  if (error) return null;
  return data as Curso;
}

export async function getCursosAdmin(): Promise<Curso[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("cursos").select("*").order("orden");
  if (error) throw new Error(error.message);
  return (data as Curso[]) ?? [];
}

export async function getCursoAdmin(id: string): Promise<Curso | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("cursos").select("*").eq("id", id).single();
  if (error) return null;
  return data as Curso;
}

export async function getArchivosCurso(cursoId: string): Promise<ArchivoCurso[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("archivos_curso")
    .select("*")
    .eq("curso_id", cursoId)
    .order("creado_en");
  if (error) return [];
  return (data as ArchivoCurso[]) ?? [];
}

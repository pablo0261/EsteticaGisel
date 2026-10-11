import { datosDelTenant } from "@/lib/tenant/datos";
import type { AccesoCurso, ArchivoCurso, Curso } from "./types";

export async function getCursosPublicos(tenantId: string): Promise<Curso[]> {
  try {
    const { data, error } = await datosDelTenant(tenantId)
      .select("cursos")
      .eq("estado", "publicado")
      .order("orden");
    if (error) return [];
    return (data as unknown as Curso[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCursoPublico(tenantId: string, id: string): Promise<Curso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("cursos")
    .eq("id", id)
    .eq("estado", "publicado")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Curso;
}

export async function getCursosAdmin(tenantId: string): Promise<Curso[]> {
  const { data, error } = await datosDelTenant(tenantId).select("cursos").order("orden");
  if (error) throw new Error(error.message);
  return (data as unknown as Curso[]) ?? [];
}

export async function getCursoAdmin(tenantId: string, id: string): Promise<Curso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("cursos")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Curso;
}

export async function getAccesosDeCurso(tenantId: string, cursoId: string): Promise<AccesoCurso[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("accesos_curso")
    .eq("curso_id", cursoId)
    .order("comprado_en", { ascending: false });
  if (error) return [];
  return (data as unknown as AccesoCurso[]) ?? [];
}

export async function getArchivosCurso(tenantId: string, cursoId: string): Promise<ArchivoCurso[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("archivos_curso")
    .eq("curso_id", cursoId)
    .order("creado_en");
  if (error) return [];
  return (data as unknown as ArchivoCurso[]) ?? [];
}

export type AccesoConCurso = AccesoCurso & { cursos: Curso };

export async function getAccesoPorToken(
  tenantId: string,
  token: string,
): Promise<AccesoConCurso | null> {
  const { data, error } = await datosDelTenant(tenantId)
    .select("accesos_curso", "*, cursos(*)")
    .eq("token_acceso", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as AccesoConCurso;
}

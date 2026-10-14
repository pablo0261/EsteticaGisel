import { NextResponse } from "next/server";
import { getCursoAdmin } from "@/lib/data/cursos";
import { videoProvider } from "@/lib/video";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!tenant.modulos.cursos) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { id } = await params;
  const curso = await getCursoAdmin(tenant.id, id);
  if (!curso?.video_storage_path) {
    return NextResponse.json({ error: "Este curso no tiene video subido." }, { status: 404 });
  }

  const url = await videoProvider.urlFirmada(curso.video_storage_path, 300);
  return NextResponse.redirect(url);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCursoAdmin } from "@/lib/data/cursos";
import { videoProvider } from "@/lib/video";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const curso = await getCursoAdmin(id);
  if (!curso?.video_storage_path) {
    return NextResponse.json({ error: "Este curso no tiene video subido." }, { status: 404 });
  }

  const url = await videoProvider.urlFirmada(curso.video_storage_path, 300);
  return NextResponse.redirect(url);
}

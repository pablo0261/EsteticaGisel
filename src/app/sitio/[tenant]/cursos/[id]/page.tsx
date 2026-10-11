import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCursoPublico } from "@/lib/data/cursos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecioARS } from "@/lib/format";
import { CompraForm } from "@/components/cursos/CompraForm";
import { youtubeId } from "@/lib/video/youtube";
import { VistaPreviaYoutube } from "@/components/cursos/VistaPreviaYoutube";

const SEGUNDOS_PREVIEW = 30;

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.cursos) notFound();
  const { id } = await params;
  const curso = await getCursoPublico(tenant.id, id);
  if (!curso) notFound();

  const precio = precioEfectivo({
    precio: curso.precio,
    precioOferta: curso.precio_oferta,
    ofertaActiva: curso.oferta_activa,
    ofertaDesde: curso.oferta_desde,
    ofertaHasta: curso.oferta_hasta,
    ahoraIso: new Date().toISOString(),
  });
  const enOferta = precio !== curso.precio;
  const videoId = curso.preview_youtube_url ? youtubeId(curso.preview_youtube_url) : null;

  return (
    <main className="min-h-screen bg-cream px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
          {curso.categoria === "profesional" ? "Profesional" : "Público general"}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          {curso.titulo}
        </h1>
        {curso.descripcion && (
          <p className="mt-4 font-sans text-ink-soft">{curso.descripcion}</p>
        )}

        {videoId && (
          <figure className="mt-8">
            <VistaPreviaYoutube
              videoId={videoId}
              titulo={curso.titulo}
              segundos={SEGUNDOS_PREVIEW}
            />
            <figcaption className="mt-2 font-sans text-sm text-ink-soft">
              Vista previa de {SEGUNDOS_PREVIEW} segundos. El curso completo se habilita al comprarlo.
            </figcaption>
          </figure>
        )}

        <p className="mt-6 font-sans text-2xl text-mauve-dark">
          {enOferta && (
            <span className="mr-2 text-base text-ink-soft line-through">
              {formatPrecioARS(curso.precio)}
            </span>
          )}
          {formatPrecioARS(precio)}
        </p>

        <p className="mt-2 font-sans text-sm text-ink-soft">
          Acceso por {curso.dias_acceso} días desde la compra.
        </p>

        <div id="comprar" className="scroll-mt-28">
          <CompraForm cursoId={curso.id} />
        </div>
      </Container>
    </main>
  );
}

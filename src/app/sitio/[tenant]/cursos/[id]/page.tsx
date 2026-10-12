import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCursoPublico } from "@/lib/data/cursos";
import { getTenantPorSlug, tenantDeLaPagina } from "@/lib/tenant/actual";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecio } from "@/lib/format";
import { CompraForm } from "@/components/cursos/CompraForm";
import { youtubeId } from "@/lib/video/youtube";
import { VistaPreviaYoutube } from "@/components/cursos/VistaPreviaYoutube";
import { traductor } from "@/lib/i18n/textos";

const SEGUNDOS_PREVIEW = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}): Promise<Metadata> {
  const { tenant: slug, id } = await params;
  const tenant = await getTenantPorSlug(slug);
  if (!tenant?.modulos.cursos) return {};
  const curso = await getCursoPublico(tenant.id, id);
  return curso ? { title: curso.titulo } : {};
}

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
  const t = traductor(tenant.idioma);
  const formatear = (monto: number) => formatPrecio(monto, tenant.moneda, tenant.idioma);

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
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {curso.categoria === "profesional"
            ? t({ es: "Profesional", pt: "Profissional" })
            : t({ es: "Público general", pt: "Público geral" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {curso.titulo}
        </h1>
        {curso.descripcion && (
          <p className="mt-4 font-sans text-texto-suave">{curso.descripcion}</p>
        )}

        {videoId && (
          <figure className="mt-8">
            <VistaPreviaYoutube
              videoId={videoId}
              titulo={curso.titulo}
              segundos={SEGUNDOS_PREVIEW}
            />
            <figcaption className="mt-2 font-sans text-sm text-texto-suave">
              {t({
                es: `Vista previa de ${SEGUNDOS_PREVIEW} segundos. El curso completo se habilita al comprarlo.`,
                pt: `Prévia de ${SEGUNDOS_PREVIEW} segundos. O curso completo é liberado após a compra.`,
              })}
            </figcaption>
          </figure>
        )}

        <p className="mt-6 font-sans text-2xl text-primario-oscuro">
          {enOferta && (
            <span className="mr-2 text-base text-texto-suave line-through">
              {formatear(curso.precio)}
            </span>
          )}
          {formatear(precio)}
        </p>

        <p className="mt-2 font-sans text-sm text-texto-suave">
          {t({
            es: `Acceso por ${curso.dias_acceso} días desde la compra.`,
            pt: `Acesso por ${curso.dias_acceso} dias a partir da compra.`,
          })}
        </p>

        <div id="comprar" className="scroll-mt-28">
          <CompraForm cursoId={curso.id} />
        </div>
      </Container>
    </main>
  );
}

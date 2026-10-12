import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCursosPublicos } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecio } from "@/lib/format";
import { youtubeId, youtubeMiniatura } from "@/lib/video/youtube";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { iniciales } from "@/lib/tenant/iniciales";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Cursos", pt: "Cursos" });
}

export default async function CursosPage({ params }: Props) {
  // El catálogo cambia desde el admin: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.cursos) notFound();
  const t = traductor(tenant.idioma);
  const formatear = (monto: number) => formatPrecio(monto, tenant.moneda, tenant.idioma);
  const cursos = await getCursosPublicos(tenant.id);
  const ahora = new Date().toISOString();

  return (
    <main className="min-h-screen bg-fondo pt-24 pb-20">
      <Container>
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "Cursos", pt: "Cursos" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Cursos de estética", pt: "Cursos de estética" })}
        </h1>
        <p className="mt-4 max-w-xl font-sans text-texto-suave">
          {t({
            es: "Contenido en video para profesionales del rubro y para quienes quieren aprender a cuidarse en casa.",
            pt: "Conteúdo em vídeo para profissionais da área e para quem quer aprender a se cuidar em casa.",
          })}
        </p>

        {cursos.length === 0 ? (
          <p className="mt-8 font-sans text-texto-suave">
            {t({
              es: "Muy pronto vas a poder comprar y ver mis cursos online desde acá.",
              pt: "Em breve você vai poder comprar e assistir aos meus cursos online por aqui.",
            })}
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => {
              const precio = precioEfectivo({
                precio: c.precio,
                precioOferta: c.precio_oferta,
                ofertaActiva: c.oferta_activa,
                ofertaDesde: c.oferta_desde,
                ofertaHasta: c.oferta_hasta,
                ahoraIso: ahora,
              });
              const enOferta = precio !== c.precio;
              const videoId = c.preview_youtube_url ? youtubeId(c.preview_youtube_url) : null;
              return (
                <Link
                  key={c.id}
                  href={`/cursos/${c.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-primario/15 bg-white/60 transition hover:border-primario/40 hover:shadow-sm"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primario-suave to-secundario/30">
                    {videoId ? (
                      <>
                        <Image
                          src={youtubeMiniatura(videoId)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-texto/10">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-fondo/90 text-primario-oscuro shadow-md">
                            <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                        <span className="absolute bottom-3 left-3 rounded-full bg-texto/70 px-3 py-1 font-sans text-xs text-fondo">
                          {t({ es: "Vista previa", pt: "Prévia" })}
                        </span>
                      </>
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center font-serif text-6xl text-white/40"
                      >
                        {iniciales(tenant.nombre)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-sans text-xs uppercase tracking-wider text-secundario">
                      {c.categoria === "profesional"
                        ? t({ es: "Profesional", pt: "Profissional" })
                        : t({ es: "Público general", pt: "Público geral" })}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl text-texto">{c.titulo}</h2>
                    <p className="mt-3 font-sans text-lg text-primario-oscuro">
                      {enOferta && (
                        <span className="mr-2 text-sm text-texto-suave line-through">
                          {formatear(c.precio)}
                        </span>
                      )}
                      {formatear(precio)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </main>
  );
}

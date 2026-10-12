import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  getAccesoPorToken,
  getArchivosCurso,
  type AccesoConCurso,
} from "@/lib/data/cursos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { accesoVigente } from "@/lib/cursos/reglas";
import { videoProvider } from "@/lib/video";
import { urlFirmadaArchivo } from "@/lib/storage/archivos";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenant: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Mi curso", pt: "Meu curso" });
}

/** Fecha corta en el idioma y la zona del tenant. */
function fechaCorta(iso: string, tenant: Tenant): string {
  return new Date(iso).toLocaleDateString(LOCALES[tenant.idioma], { timeZone: tenant.zonaHoraria });
}

export default async function AccesoCursoPage({ params }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const acceso = await getAccesoPorToken(tenant.id, token);
  const t = traductor(tenant.idioma);

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        {!acceso ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "No encontramos ese acceso.", pt: "Não encontramos esse acesso." })}
          </p>
        ) : !accesoVigente(acceso.expira_en, new Date().toISOString()) ? (
          <div>
            <h1 className="font-serif text-3xl text-texto">
              {t({ es: "Tu acceso expiró", pt: "Seu acesso expirou" })}
            </h1>
            <p className="mt-3 font-sans text-texto-suave">
              {t({
                es: `El acceso a “${acceso.cursos.titulo}” venció el ${fechaCorta(acceso.expira_en, tenant)}.`,
                pt: `O acesso a “${acceso.cursos.titulo}” venceu em ${fechaCorta(acceso.expira_en, tenant)}.`,
              })}
            </p>
            <Button href={`/cursos/${acceso.curso_id}`} className="mt-6">
              {t({ es: "Comprar de nuevo", pt: "Comprar novamente" })}
            </Button>
          </div>
        ) : (
          <AccesoVigenteContenido tenant={tenant} acceso={acceso} />
        )}
      </Container>
    </main>
  );
}

async function AccesoVigenteContenido({
  tenant,
  acceso,
}: {
  tenant: Tenant;
  acceso: AccesoConCurso;
}) {
  const t = traductor(tenant.idioma);
  const curso = acceso.cursos;
  const archivos = await getArchivosCurso(tenant.id, curso.id);

  const videoUrl = curso.video_storage_path
    ? await videoProvider.urlFirmada(curso.video_storage_path, 600)
    : null;
  const descargaVideoUrl =
    curso.permitir_descarga && curso.video_storage_path
      ? await videoProvider.urlFirmada(curso.video_storage_path, 600)
      : null;
  const archivosConUrl = await Promise.all(
    archivos.map(async (a) => ({
      ...a,
      url: await urlFirmadaArchivo(a.storage_path, 600),
    })),
  );

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
        {t({
          es: `Acceso hasta ${fechaCorta(acceso.expira_en, tenant)}`,
          pt: `Acesso até ${fechaCorta(acceso.expira_en, tenant)}`,
        })}
      </p>
      <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">{curso.titulo}</h1>

      {videoUrl ? (
        <video
          key={videoUrl}
          controls
          controlsList={descargaVideoUrl ? undefined : "nodownload"}
          className="mt-6 w-full rounded-2xl bg-black"
        >
          <source src={videoUrl} />
        </video>
      ) : (
        <p className="mt-6 font-sans text-texto-suave">
          {t({
            es: "El video de este curso todavía no está disponible.",
            pt: "O vídeo deste curso ainda não está disponível.",
          })}
        </p>
      )}

      {descargaVideoUrl && (
        <a
          href={descargaVideoUrl}
          className="mt-3 inline-block font-sans text-sm text-primario underline"
        >
          {t({ es: "Descargar video", pt: "Baixar vídeo" })}
        </a>
      )}

      {archivosConUrl.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Materiales", pt: "Materiais" })}</h2>
          <ul className="mt-3 space-y-2">
            {archivosConUrl.map((a) => (
              <li key={a.id}>
                <a href={a.url} className="font-sans text-sm text-primario underline">
                  {a.nombre_archivo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

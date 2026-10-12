import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  getAccesoPorToken,
  getArchivosCurso,
  type AccesoConCurso,
} from "@/lib/data/cursos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { accesoVigente } from "@/lib/cursos/reglas";
import { videoProvider } from "@/lib/video";
import { urlFirmadaArchivo } from "@/lib/storage/archivos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi curso" };

export default async function AccesoCursoPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const acceso = await getAccesoPorToken(tenant.id, token);

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-2xl">
        {!acceso ? (
          <p className="font-sans text-texto-suave">No encontramos ese acceso.</p>
        ) : !accesoVigente(acceso.expira_en, new Date().toISOString()) ? (
          <div>
            <h1 className="font-serif text-3xl text-texto">Tu acceso expiró</h1>
            <p className="mt-3 font-sans text-texto-suave">
              El acceso a &ldquo;{acceso.cursos.titulo}&rdquo; venció el{" "}
              {new Date(acceso.expira_en).toLocaleDateString("es-AR")}.
            </p>
            <Button href={`/cursos/${acceso.curso_id}`} className="mt-6">
              Comprar de nuevo
            </Button>
          </div>
        ) : (
          <AccesoVigenteContenido tenantId={tenant.id} acceso={acceso} />
        )}
      </Container>
    </main>
  );
}

async function AccesoVigenteContenido({
  tenantId,
  acceso,
}: {
  tenantId: string;
  acceso: AccesoConCurso;
}) {
  const curso = acceso.cursos;
  const archivos = await getArchivosCurso(tenantId, curso.id);

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
        Acceso hasta {new Date(acceso.expira_en).toLocaleDateString("es-AR")}
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
          El video de este curso todavía no está disponible.
        </p>
      )}

      {descargaVideoUrl && (
        <a
          href={descargaVideoUrl}
          className="mt-3 inline-block font-sans text-sm text-primario underline"
        >
          Descargar video
        </a>
      )}

      {archivosConUrl.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl text-texto">Materiales</h2>
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

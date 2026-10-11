import { notFound } from "next/navigation";
import { getCursoAdmin, getArchivosCurso, getAccesosDeCurso } from "@/lib/data/cursos";
import {
  updateCurso,
  deleteCurso,
  subirVideoCurso,
  subirArchivoAdicional,
  eliminarArchivoAdicional,
} from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { InfoHint } from "@/components/ui/InfoHint";

export const metadata = { title: "Editar curso · Panel" };

export default async function EditarCursoAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curso = await getCursoAdmin(id);
  if (!curso) notFound();
  const archivos = await getArchivosCurso(id);
  const accesos = await getAccesosDeCurso(id);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl text-ink">{curso.titulo}</h1>

      <form action={updateCurso} className="mt-6 flex flex-col gap-4 rounded-2xl border border-mauve/15 bg-white/60 p-5">
        <input type="hidden" name="id" value={curso.id} />

        <label className="font-sans text-sm text-ink-soft">
          Título
          <input
            name="titulo"
            defaultValue={curso.titulo}
            required
            className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
          />
        </label>

        <label className="font-sans text-sm text-ink-soft">
          Descripción
          <textarea
            name="descripcion"
            defaultValue={curso.descripcion ?? ""}
            rows={3}
            className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
          />
        </label>

        <label className="font-sans text-sm text-ink-soft">
          Vista previa (link de YouTube, se muestran los primeros 30 s)
          <input
            name="preview_youtube_url"
            type="url"
            defaultValue={curso.preview_youtube_url ?? ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex-1 font-sans text-sm text-ink-soft">
            Categoría
            <select
              name="categoria"
              defaultValue={curso.categoria}
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            >
              <option value="publico_general">Público general</option>
              <option value="profesional">Profesional</option>
            </select>
          </label>
          <label className="flex-1 font-sans text-sm text-ink-soft">
            Estado
            <select
              name="estado"
              defaultValue={curso.estado}
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            >
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
            </select>
          </label>
        </div>

        <div className="flex gap-4">
          <label className="flex-1 font-sans text-sm text-ink-soft">
            Precio
            <input
              name="precio"
              type="number"
              defaultValue={curso.precio}
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>
          <label className="flex-1 font-sans text-sm text-ink-soft">
            Días de acceso
            <input
              name="dias_acceso"
              type="number"
              defaultValue={curso.dias_acceso}
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>
          <label className="flex-1 font-sans text-sm text-ink-soft">
            Orden
            <input
              name="orden"
              type="number"
              defaultValue={curso.orden}
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 font-sans text-sm text-ink-soft">
          <input
            name="permitir_descarga"
            type="checkbox"
            defaultChecked={curso.permitir_descarga}
          />
          Permitir descarga del video (si no, solo streaming protegido)
        </label>

        <div className="rounded-xl border border-mauve/10 bg-cream p-4">
          <label className="flex items-center gap-2 font-sans text-sm font-medium text-ink">
            <input name="oferta_activa" type="checkbox" defaultChecked={curso.oferta_activa} />
            Oferta activa
          </label>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="font-sans text-sm text-ink-soft">
              Precio de oferta
              <input
                name="precio_oferta"
                type="number"
                defaultValue={curso.precio_oferta ?? ""}
                className="mt-1 w-40 rounded-lg border border-mauve/20 bg-white px-3 py-2 text-ink"
              />
            </label>
            <label className="font-sans text-sm text-ink-soft">
              Desde
              <input
                name="oferta_desde"
                type="datetime-local"
                defaultValue={curso.oferta_desde?.slice(0, 16) ?? ""}
                className="mt-1 rounded-lg border border-mauve/20 bg-white px-3 py-2 text-ink"
              />
            </label>
            <label className="font-sans text-sm text-ink-soft">
              Hasta
              <input
                name="oferta_hasta"
                type="datetime-local"
                defaultValue={curso.oferta_hasta?.slice(0, 16) ?? ""}
                className="mt-1 rounded-lg border border-mauve/20 bg-white px-3 py-2 text-ink"
              />
            </label>
          </div>
        </div>

        <SubmitButton className="self-start rounded-full bg-mauve px-7 py-3 text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60">
          Guardar
        </SubmitButton>
        <FormPendingOverlay label="Guardando cambios…" />
      </form>

      <div className="mt-6 rounded-2xl border border-mauve/15 bg-white/60 p-5">
        <h2 className="font-serif text-2xl text-ink">Video</h2>
        <div className="mt-2">
          <InfoHint>
            Subilo en <strong>MP4 (H.264)</strong>, comprimido a 720p si podés —
            es el formato más liviano que se reproduce bien en todos los
            celulares y navegadores. Límite de esta versión de prueba:{" "}
            <strong>150MB por video</strong>. Si necesitás videos más pesados,
            avisame para pasar a otro storage.
          </InfoHint>
        </div>
        {curso.video_storage_path ? (
          <p className="mt-2 font-sans text-sm text-ink-soft">
            Video cargado.{" "}
            <a
              href={`/admin/cursos/${curso.id}/video-preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mauve underline"
            >
              Ver (link temporal)
            </a>
          </p>
        ) : (
          <p className="mt-2 font-sans text-sm text-ink-soft">Todavía no se subió video.</p>
        )}
        <form action={subirVideoCurso} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="cursoId" value={curso.id} />
          <input name="video" type="file" accept="video/*" required className="font-sans text-sm" />
          <SubmitButton className="rounded-full bg-sage px-4 py-2 text-sm text-cream transition hover:bg-sage-dark disabled:opacity-60">
            Subir
          </SubmitButton>
          <FormPendingOverlay label="Subiendo video…" />
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-mauve/15 bg-white/60 p-5">
        <h2 className="font-serif text-2xl text-ink">Archivos adicionales</h2>
        <ul className="mt-3 space-y-2">
          {archivos.map((a) => (
            <li key={a.id} className="flex items-center justify-between font-sans text-sm text-ink-soft">
              {a.nombre_archivo}
              <form action={eliminarArchivoAdicional}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="cursoId" value={curso.id} />
                <input type="hidden" name="storagePath" value={a.storage_path} />
                <SubmitButton className="text-mauve hover:text-mauve-dark disabled:opacity-60">
                  Eliminar
                </SubmitButton>
                <FormPendingOverlay label="Eliminando…" />
              </form>
            </li>
          ))}
          {archivos.length === 0 && (
            <li className="font-sans text-sm text-ink-soft">Sin archivos adicionales.</li>
          )}
        </ul>
        <form action={subirArchivoAdicional} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="cursoId" value={curso.id} />
          <input name="archivo" type="file" accept=".pdf,.ppt,.pptx" required className="font-sans text-sm" />
          <SubmitButton className="rounded-full bg-sage px-4 py-2 text-sm text-cream transition hover:bg-sage-dark disabled:opacity-60">
            Subir
          </SubmitButton>
          <FormPendingOverlay label="Subiendo archivo…" />
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-mauve/15 bg-white/60 p-5">
        <h2 className="font-serif text-2xl text-ink">Compras</h2>
        {accesos.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-ink-soft">
            Todavía no hay compras de este curso.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accesos.map((a) => {
              const vigente = new Date(a.expira_en) > new Date();
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm text-ink-soft"
                >
                  <span>
                    {a.cliente_email} · comprado el{" "}
                    {new Date(a.comprado_en).toLocaleDateString("es-AR")}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      vigente ? "bg-sage/15 text-sage-dark" : "bg-ink/5 text-ink-soft"
                    }`}
                  >
                    {vigente ? "Vigente" : "Vencido"} hasta{" "}
                    {new Date(a.expira_en).toLocaleDateString("es-AR")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form action={deleteCurso} className="mt-6">
        <input type="hidden" name="id" value={curso.id} />
        <SubmitButton className="font-sans text-sm text-mauve hover:text-mauve-dark disabled:opacity-60">
          Eliminar este curso
        </SubmitButton>
        <FormPendingOverlay label="Eliminando curso…" />
      </form>
    </div>
  );
}

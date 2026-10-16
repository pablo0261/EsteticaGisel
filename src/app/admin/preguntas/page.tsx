import type { Metadata } from "next";
import {
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getPreguntasAdmin } from "@/lib/data/preguntas";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearPregunta, editarPregunta, eliminarPregunta } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" });
}

export default async function PreguntasAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("preguntas");
  if (!tenant) return null; // cliente suspendido: el layout muestra el aviso
  const t = traductor(tenant.idioma);
  const preguntas = await getPreguntasAdmin(tenant.id);
  const etiqueta = {
    pregunta: t({ es: "Pregunta", pt: "Pergunta" }),
    respuesta: t({ es: "Respuesta", pt: "Resposta" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div className="max-w-3xl">
      <h1 className={TITULO}>{t({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Se muestran en el inicio del sitio. Separá los párrafos de una respuesta con una línea en blanco.",
          pt: "Aparecem na página inicial do site. Separe os parágrafos de uma resposta com uma linha em branco.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nueva-pregunta" action={crearPregunta} className={`${TARJETA} flex flex-col gap-3`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Nueva pregunta", pt: "Nova pergunta" })}</h2>
        <label className={ETIQUETA}>
          {etiqueta.pregunta}
          <input name="pregunta" required maxLength={L.pregunta} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {etiqueta.respuesta}
          <textarea name="respuesta" required maxLength={L.respuesta} rows={4} className={CAMPO} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className={ETIQUETA}>
            {etiqueta.orden}
            <input name="orden" type="number" min={0} max={L.ordenMax} defaultValue={preguntas.length} className={`${CAMPO} w-24`} />
          </label>
          <label className={CASILLA}>
            <input name="activo" type="checkbox" defaultChecked />
            {etiqueta.activo}
          </label>
        </div>
        <div>
          <SubmitButton className={BOTON}>{t({ es: "Agregar", pt: "Adicionar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Agregando…", pt: "Adicionando…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {preguntas.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay preguntas.", pt: "Ainda não há perguntas." })}</p>
        )}
        {preguntas.map((p) => (
          <div key={p.id} className={`${FILA} flex flex-col gap-3`}>
            <form id={`form-pregunta-${p.id}`} action={editarPregunta} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={p.id} />
              <input
                name="pregunta"
                defaultValue={p.pregunta}
                aria-label={etiqueta.pregunta}
                required
                maxLength={L.pregunta}
                className={CAMPO_EN_LINEA}
              />
              <textarea
                name="respuesta"
                defaultValue={p.respuesta}
                aria-label={etiqueta.respuesta}
                required
                maxLength={L.respuesta}
                rows={4}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-4">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={p.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={p.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-pregunta-${p.id}`} action={eliminarPregunta}>
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

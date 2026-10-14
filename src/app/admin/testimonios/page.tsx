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
import { getTestimoniosAdmin } from "@/lib/data/testimonios";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearTestimonio, editarTestimonio, eliminarTestimonio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Testimonios", pt: "Depoimentos" });
}

export default async function TestimoniosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("testimonios");
  const t = traductor(tenant.idioma);
  const testimonios = await getTestimoniosAdmin(tenant.id);
  const etiqueta = {
    nombre: t({ es: "Nombre de quien opina", pt: "Nome de quem dá o depoimento" }),
    texto: t({ es: "Testimonio", pt: "Depoimento" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div className="max-w-3xl">
      <h1 className={TITULO}>{t({ es: "Testimonios", pt: "Depoimentos" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Se muestran en el inicio del sitio, ordenados por el número de orden.",
          pt: "Aparecem na página inicial do site, na ordem indicada.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nuevo-testimonio" action={crearTestimonio} className={`${TARJETA} flex flex-col gap-3`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Nuevo testimonio", pt: "Novo depoimento" })}</h2>
        <label className={ETIQUETA}>
          {etiqueta.nombre}
          <input name="nombre" required maxLength={L.nombre} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {etiqueta.texto}
          <textarea name="texto" required maxLength={L.testimonio} rows={3} className={CAMPO} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className={ETIQUETA}>
            {etiqueta.orden}
            <input name="orden" type="number" min={0} max={L.ordenMax} defaultValue={testimonios.length} className={`${CAMPO} w-24`} />
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
        {testimonios.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">
            {t({ es: "Todavía no hay testimonios.", pt: "Ainda não há depoimentos." })}
          </p>
        )}
        {testimonios.map((x) => (
          <div key={x.id} className={`${FILA} flex flex-col gap-3`}>
            <form id={`form-testimonio-${x.id}`} action={editarTestimonio} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={x.id} />
              <input
                name="nombre"
                defaultValue={x.nombre}
                aria-label={etiqueta.nombre}
                required
                maxLength={L.nombre}
                className={CAMPO_EN_LINEA}
              />
              <textarea
                name="texto"
                defaultValue={x.texto}
                aria-label={etiqueta.texto}
                required
                maxLength={L.testimonio}
                rows={3}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-4">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={x.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={x.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-testimonio-${x.id}`} action={eliminarTestimonio}>
              <input type="hidden" name="id" value={x.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

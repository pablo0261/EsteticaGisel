import type { Metadata } from "next";
import Image from "next/image";
import {
  AYUDA,
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
import { getGaleriaAdmin } from "@/lib/data/galeria";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { editarImagen, eliminarImagen, subirImagen } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Galería", pt: "Galeria" });
}

export default async function GaleriaAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("galeria");
  if (!tenant) return null; // cliente suspendido: el layout muestra el aviso
  const t = traductor(tenant.idioma);
  const imagenes = await getGaleriaAdmin(tenant.id);
  const llena = imagenes.length >= L.imagenesGaleria;
  const etiqueta = {
    descripcion: t({ es: "Descripción (opcional)", pt: "Descrição (opcional)" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "visible en el sitio", pt: "visível no site" }),
  };

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Galería", pt: "Galeria" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: `Fotos de tus trabajos para el inicio del sitio: ${imagenes.length} de ${L.imagenesGaleria}.`,
          pt: `Fotos dos seus trabalhos para a página inicial do site: ${imagenes.length} de ${L.imagenesGaleria}.`,
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      {!llena && (
        <form id="form-subir-imagen" action={subirImagen} className={`${TARJETA} flex max-w-2xl flex-col gap-3`}>
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Subir una imagen", pt: "Enviar uma imagem" })}</h2>
          <label className={ETIQUETA}>
            {t({ es: "Imagen", pt: "Imagem" })}
            <input name="archivo" type="file" accept="image/png,image/jpeg,image/webp" required className="mt-1 block font-sans text-sm" />
            <span className={`${AYUDA} block`}>
              {t({ es: "PNG, JPG o WebP, hasta 2 MB.", pt: "PNG, JPG ou WebP, até 2 MB." })}
            </span>
          </label>
          <label className={ETIQUETA}>
            {etiqueta.descripcion}
            <input name="descripcion" maxLength={L.descripcionImagen} className={CAMPO} />
          </label>
          <div>
            <SubmitButton className={BOTON}>{t({ es: "Subir", pt: "Enviar" })}</SubmitButton>
          </div>
          <FormPendingOverlay label={t({ es: "Subiendo…", pt: "Enviando…" })} />
        </form>
      )}

      {imagenes.length === 0 && (
        <p className="mt-6 font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay imágenes.", pt: "Ainda não há imagens." })}</p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imagenes.map((img) => (
          <div key={img.id} className={`${FILA} flex flex-col gap-3`}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-fondo">
              <Image
                src={img.imagen_url}
                alt={img.descripcion ?? ""}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <form id={`form-imagen-${img.id}`} action={editarImagen} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={img.id} />
              <input
                name="descripcion"
                defaultValue={img.descripcion ?? ""}
                aria-label={etiqueta.descripcion}
                placeholder={etiqueta.descripcion}
                maxLength={L.descripcionImagen}
                className={CAMPO_EN_LINEA}
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  name="orden"
                  type="number"
                  min={0}
                  max={L.ordenMax}
                  defaultValue={img.orden}
                  aria-label={etiqueta.orden}
                  className={`${CAMPO_EN_LINEA} w-20`}
                />
                <label className={CASILLA}>
                  <input name="activo" type="checkbox" defaultChecked={img.activo} />
                  {etiqueta.activo}
                </label>
                <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              </div>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-imagen-${img.id}`} action={eliminarImagen}>
              <input type="hidden" name="id" value={img.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

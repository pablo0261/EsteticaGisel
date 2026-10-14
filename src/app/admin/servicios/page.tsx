import type { Metadata } from "next";
import {
  BOTON,
  BOTON_SECUNDARIO,
  CAMPO_EN_LINEA,
  CASILLA,
  ENLACE,
  FILA,
  Mensajes,
  SUBTITULO,
  TARJETA,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getServiciosAdmin } from "@/lib/data/servicios";
import { formatDuracion, formatPrecio } from "@/lib/format";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { crearServicio, editarServicio, eliminarServicio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Servicios", pt: "Serviços" });
}

export default async function ServiciosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("servicios");
  const t = traductor(tenant.idioma);
  const servicios = await getServiciosAdmin(tenant.id);
  // BRL tiene centavos; ARS se maneja en pesos enteros.
  const pasoPrecio = tenant.moneda === "BRL" ? "0.01" : "1";
  const etiqueta = {
    nombre: t({ es: "Nombre", pt: "Nome" }),
    minutos: t({ es: "Minutos", pt: "Minutos" }),
    precio: t({ es: "Precio", pt: "Preço" }),
    orden: t({ es: "Orden", pt: "Ordem" }),
    activo: t({ es: "activo", pt: "ativo" }),
  };

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Servicios", pt: "Serviços" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Cargá el precio y la duración (en minutos) de cada servicio. Con el precio vacío o en 0, el sitio muestra “Consultar”. Desmarcá “activo” para ocultarlo del sitio.",
          pt: "Informe o preço e a duração (em minutos) de cada serviço. Com o preço vazio ou 0, o site mostra “Sob consulta”. Desmarque “ativo” para ocultá-lo do site.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-nuevo-servicio" action={crearServicio} className={`${TARJETA} flex flex-wrap items-end gap-3`}>
        <input
          name="nombre"
          placeholder={etiqueta.nombre}
          aria-label={etiqueta.nombre}
          required
          maxLength={L.nombre}
          className={`${CAMPO_EN_LINEA} min-w-48 flex-1`}
        />
        <input
          name="duracion_minutos"
          type="number"
          min={L.duracionMin}
          max={L.duracionMax}
          placeholder={etiqueta.minutos}
          aria-label={etiqueta.minutos}
          required
          className={`${CAMPO_EN_LINEA} w-24`}
        />
        <input
          name="precio"
          type="number"
          min={0}
          step={pasoPrecio}
          placeholder={etiqueta.precio}
          aria-label={etiqueta.precio}
          className={`${CAMPO_EN_LINEA} w-32`}
        />
        <input
          name="orden"
          type="number"
          min={0}
          max={L.ordenMax}
          placeholder={etiqueta.orden}
          aria-label={etiqueta.orden}
          className={`${CAMPO_EN_LINEA} w-24`}
        />
        <label className={CASILLA}>
          <input name="activo" type="checkbox" defaultChecked />
          {etiqueta.activo}
        </label>
        <SubmitButton className={BOTON}>{t({ es: "Agregar", pt: "Adicionar" })}</SubmitButton>
        <FormPendingOverlay label={t({ es: "Agregando servicio…", pt: "Adicionando serviço…" })} />
      </form>

      <div className="mt-6 space-y-3">
        {servicios.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay servicios.", pt: "Ainda não há serviços." })}</p>
        )}
        {servicios.map((s) => (
          <div key={s.id} className={`${FILA} flex flex-wrap items-center gap-3`}>
            <form id={`form-servicio-${s.id}`} action={editarServicio} className="flex flex-1 flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={s.id} />
              <input
                name="nombre"
                defaultValue={s.nombre}
                aria-label={etiqueta.nombre}
                required
                maxLength={L.nombre}
                className={`${CAMPO_EN_LINEA} min-w-48 flex-1`}
              />
              <input
                name="duracion_minutos"
                type="number"
                min={L.duracionMin}
                max={L.duracionMax}
                defaultValue={s.duracion_minutos}
                aria-label={etiqueta.minutos}
                title={formatDuracion(s.duracion_minutos)}
                className={`${CAMPO_EN_LINEA} w-20`}
              />
              <input
                name="precio"
                type="number"
                min={0}
                step={pasoPrecio}
                defaultValue={s.precio}
                aria-label={etiqueta.precio}
                title={formatPrecio(s.precio, tenant.moneda, tenant.idioma)}
                className={`${CAMPO_EN_LINEA} w-28`}
              />
              <input
                name="orden"
                type="number"
                min={0}
                max={L.ordenMax}
                defaultValue={s.orden}
                aria-label={etiqueta.orden}
                className={`${CAMPO_EN_LINEA} w-20`}
              />
              <label className={CASILLA}>
                <input name="activo" type="checkbox" defaultChecked={s.activo} />
                {etiqueta.activo}
              </label>
              <SubmitButton className={BOTON_SECUNDARIO}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
            </form>
            <form id={`form-eliminar-servicio-${s.id}`} action={eliminarServicio}>
              <input type="hidden" name="id" value={s.id} />
              <SubmitButton className={ENLACE}>{t({ es: "Eliminar", pt: "Excluir" })}</SubmitButton>
              <FormPendingOverlay label={t({ es: "Eliminando…", pt: "Excluindo…" })} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

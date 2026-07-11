import { getServiciosAdmin } from "@/lib/data/servicios";
import { createServicio, updateServicio, deleteServicio } from "./actions";
import { formatPrecioARS, formatDuracion } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";

export const metadata = { title: "Servicios · Panel" };

export default async function ServiciosAdmin() {
  const servicios = await getServiciosAdmin();

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Servicios</h1>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        Cargá el precio (en pesos) y la duración (en minutos) de cada servicio.
        Desmarcá &ldquo;activo&rdquo; para ocultarlo del sitio.
      </p>

      {/* Alta */}
      <form
        action={createServicio}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-mauve/15 bg-white/60 p-4"
      >
        <input
          name="nombre"
          placeholder="Nombre"
          required
          className="min-w-48 flex-1 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <input
          name="duracion_minutos"
          type="number"
          placeholder="Min"
          required
          className="w-24 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <input
          name="precio"
          type="number"
          placeholder="Precio"
          className="w-32 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <input
          name="orden"
          type="number"
          placeholder="Orden"
          className="w-24 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <SubmitButton className="rounded-full bg-mauve px-6 py-2 text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60">
          Agregar
        </SubmitButton>
        <FormPendingOverlay label="Agregando servicio…" />
      </form>

      {/* Listado editable */}
      <div className="mt-6 space-y-3">
        {servicios.length === 0 && (
          <p className="font-sans text-sm text-ink-soft">
            No hay servicios. Si recién creaste la base, aplicá la migración
            (<code>supabase db push</code>) y recargá.
          </p>
        )}
        {servicios.map((s) => (
          <form
            key={s.id}
            action={updateServicio}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-mauve/15 bg-white/60 p-3"
          >
            <input type="hidden" name="id" value={s.id} />
            <input
              name="nombre"
              defaultValue={s.nombre}
              className="min-w-48 flex-1 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
            />
            <input
              name="duracion_minutos"
              type="number"
              defaultValue={s.duracion_minutos}
              title={formatDuracion(s.duracion_minutos)}
              className="w-20 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
            />
            <input
              name="precio"
              type="number"
              defaultValue={s.precio}
              title={formatPrecioARS(s.precio)}
              className="w-28 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
            />
            <input
              name="orden"
              type="number"
              defaultValue={s.orden}
              className="w-20 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
            />
            <label className="flex items-center gap-1 font-sans text-sm text-ink-soft">
              <input name="activo" type="checkbox" defaultChecked={s.activo} />
              activo
            </label>
            <SubmitButton className="rounded-full bg-sage px-4 py-2 text-sm text-cream transition hover:bg-sage-dark disabled:opacity-60">
              Guardar
            </SubmitButton>
            <SubmitButton
              formAction={deleteServicio}
              className="font-sans text-sm text-mauve hover:text-mauve-dark disabled:opacity-60"
            >
              Eliminar
            </SubmitButton>
            <FormPendingOverlay label="Guardando cambios…" />
          </form>
        ))}
      </div>
    </div>
  );
}

import { getConfiguracion } from "@/lib/data/configuracion";
import { updateConfiguracion } from "./actions";

export const metadata = { title: "Configuración · Panel" };

export default async function ConfiguracionAdmin() {
  const config = await getConfiguracion();

  if (!config) {
    return (
      <p className="font-sans text-ink-soft">
        No se pudo leer la configuración. Aplicá la migración de la base
        (<code>supabase db push</code>) y recargá.
      </p>
    );
  }

  const field = (name: string, label: string, value: number) => (
    <label className="font-sans text-sm text-ink-soft">
      {label}
      <input
        name={name}
        type="number"
        defaultValue={value}
        min={0}
        className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink outline-none focus:border-mauve"
      />
    </label>
  );

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-4xl text-ink">Configuración</h1>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        Estos valores controlan la lógica de turnos.
      </p>
      <form action={updateConfiguracion} className="mt-6 flex flex-col gap-4">
        {field(
          "horas_minimas_cancelacion",
          "Horas mínimas para cancelar/reprogramar",
          config.horas_minimas_cancelacion,
        )}
        {field(
          "horas_anticipacion_recordatorio",
          "Horas de anticipación del recordatorio",
          config.horas_anticipacion_recordatorio,
        )}
        {field(
          "minutos_preparacion_entre_turnos",
          "Minutos de preparación entre turnos",
          config.minutos_preparacion_entre_turnos,
        )}
        {field(
          "sena_porcentaje",
          "Porcentaje de seña (%)",
          config.sena_porcentaje,
        )}
        <button className="mt-2 self-start rounded-full bg-mauve px-7 py-3 text-sm font-medium text-cream transition hover:bg-mauve-dark">
          Guardar
        </button>
      </form>
    </div>
  );
}

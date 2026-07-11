import { getConfiguracion } from "@/lib/data/configuracion";
import { updateConfiguracion } from "./actions";
import { DIAS_SEMANA } from "@/lib/turnos/horario";

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
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl text-ink">Configuración</h1>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        Estos valores controlan la lógica de turnos.
      </p>
      <form action={updateConfiguracion} className="mt-6 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
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
        </div>

        <div>
          <h2 className="font-serif text-2xl text-ink">Horario de atención</h2>
          <div className="mt-3 flex flex-col gap-2">
            {DIAS_SEMANA.map((d) => {
              const horario = config.horario_atencion[d.key];
              return (
                <div
                  key={d.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-mauve/15 bg-white/60 p-3"
                >
                  <span className="w-24 font-sans text-sm text-ink">{d.label}</span>
                  <input
                    name={`desde_${d.key}`}
                    type="time"
                    defaultValue={horario?.[0] ?? ""}
                    className="rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-sm text-ink"
                  />
                  <span className="font-sans text-sm text-ink-soft">a</span>
                  <input
                    name={`hasta_${d.key}`}
                    type="time"
                    defaultValue={horario?.[1] ?? ""}
                    className="rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-sm text-ink"
                  />
                  <label className="ml-auto flex items-center gap-1 font-sans text-sm text-ink-soft">
                    <input
                      name={`cerrado_${d.key}`}
                      type="checkbox"
                      defaultChecked={!horario}
                    />
                    Cerrado
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <button className="self-start rounded-full bg-mauve px-7 py-3 text-sm font-medium text-cream transition hover:bg-mauve-dark">
          Guardar
        </button>
      </form>
    </div>
  );
}

import { MODULOS } from "@/lib/master/modulos";
import type { Modulos } from "@/lib/tenant/tipos";
import { ETIQUETA } from "./ui";

/** Casillas de módulos (name = columna de tenants). */
export function CasillasModulos({ valores }: { valores: Modulos }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={ETIQUETA}>Módulos</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {MODULOS.map((m) => (
          <label key={m.columna} className="flex items-center gap-2 font-sans text-sm text-texto">
            <input type="checkbox" name={m.columna} defaultChecked={valores[m.clave]} className="h-4 w-4 accent-primario" />
            {m.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

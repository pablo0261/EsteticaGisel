import Link from "next/link";
import { BOTON, ENLACE } from "@/components/master/ui";
import { esMasterVerificado } from "@/lib/auth/master";
import { TEXTO_ALERTA } from "@/lib/master/alertas";
import { MODULOS } from "@/lib/master/modulos";
import { listarClientes } from "@/lib/master/servicio";
import { urlDelTenant } from "@/lib/tenant/urls";

export default async function MasterInicio() {
  // Sin acceso, el layout ya muestra "Esta cuenta no tiene acceso": la página no lanza.
  if (!(await esMasterVerificado())) return null;
  const clientes = await listarClientes();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-texto">Panel master</h1>
          <p className="mt-2 font-sans text-texto-suave">Clientes de la plataforma.</p>
        </div>
        <Link href="/nuevo" className={BOTON}>
          Nuevo cliente
        </Link>
      </div>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-primario/15 bg-white/60">
        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="border-b border-primario/15 text-left text-texto-suave">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Subdominio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Módulos</th>
              <th className="px-4 py-3 font-medium">Alertas</th>
              <th className="px-4 py-3 font-medium">Sitio</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-primario/10 align-top last:border-0">
                <td className="px-4 py-3 text-texto">{c.nombre}</td>
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.slug}`} className="text-primario hover:text-primario-oscuro">
                    {c.slug}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={c.estado === "activo" ? "text-secundario-oscuro" : "text-primario-oscuro"}>
                    {c.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td className="px-4 py-3 text-texto-suave">
                  {MODULOS.filter((m) => c.modulos[m.clave])
                    .map((m) => m.etiqueta)
                    .join(", ") || "Ninguno"}
                </td>
                <td className="px-4 py-3">
                  {c.alertas.length === 0 ? (
                    <span className="text-texto-suave">—</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {c.alertas.map((a) => (
                        <li key={a} className="font-medium text-primario-oscuro">
                          {TEXTO_ALERTA[a]}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a href={urlDelTenant(c.slug)} target="_blank" rel="noopener noreferrer" className={ENLACE}>
                    Ver sitio ↗
                  </a>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-texto-suave">
                  Todavía no hay clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { listarTenants, masterVerificado } from "@/lib/auth/master";
import { urlDelTenant } from "@/lib/tenant/urls";

export default async function MasterInicio() {
  // Sin acceso, el layout ya muestra "Esta cuenta no tiene acceso": la página no lanza.
  const esMaster = await masterVerificado().then(
    () => true,
    () => false,
  );
  if (!esMaster) return null;
  const tenants = await listarTenants();
  return (
    <div>
      <h1 className="font-serif text-4xl text-texto">Panel master</h1>
      <p className="mt-2 font-sans text-texto-suave">Clientes de la plataforma.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-primario/15 bg-white/60">
        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="border-b border-primario/15 text-left text-texto-suave">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Subdominio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.slug} className="border-b border-primario/10 last:border-0">
                <td className="px-4 py-3 text-texto">{t.nombre}</td>
                <td className="px-4 py-3">
                  <a href={urlDelTenant(t.slug)} className="text-primario hover:text-primario-oscuro">
                    {t.slug}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className={t.estado === "activo" ? "text-secundario-oscuro" : "text-primario-oscuro"}>
                    {t.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-texto-suave">
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

import Link from "next/link";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export default async function AdminDashboard() {
  const tenant = await tenantDelAdmin();
  return (
    <div>
      <h1 className="font-serif text-4xl text-texto">Hola, {tenant.nombre}</h1>
      <p className="mt-2 font-sans text-texto-suave">
        Gestioná tu sitio desde acá.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/servicios"
          className="rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40"
        >
          <h2 className="font-serif text-2xl text-texto">Servicios</h2>
          <p className="mt-1 font-sans text-sm text-texto-suave">
            Precios, duración y disponibilidad.
          </p>
        </Link>
        <Link
          href="/admin/configuracion"
          className="rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40"
        >
          <h2 className="font-serif text-2xl text-texto">Configuración</h2>
          <p className="mt-1 font-sans text-sm text-texto-suave">
            Cancelación, recordatorios y seña.
          </p>
        </Link>
      </div>
    </div>
  );
}

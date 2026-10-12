import Link from "next/link";
import { notFound } from "next/navigation";
import { PestanasCliente } from "@/components/master/PestanasCliente";
import { ENLACE } from "@/components/master/ui";
import { esMasterVerificado } from "@/lib/auth/master";
import { clientePorSlug } from "@/lib/master/servicio";
import { urlDelTenant } from "@/lib/tenant/urls";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function ClienteLayout({ children, params }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const activo = tenant.estado === "activo";
  return (
    <div>
      <Link href="/" className={ENLACE}>
        ← Clientes
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-4xl text-texto">{tenant.nombre}</h1>
        <div className="flex items-center gap-4 font-sans text-sm">
          <span className={activo ? "text-secundario-oscuro" : "font-medium text-primario-oscuro"}>
            {activo ? "Activo" : "Suspendido"}
          </span>
          <a href={urlDelTenant(tenant.slug)} target="_blank" rel="noopener noreferrer" className={ENLACE}>
            Ver sitio ↗
          </a>
        </div>
      </div>
      <PestanasCliente slug={tenant.slug} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

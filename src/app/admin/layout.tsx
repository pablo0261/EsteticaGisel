import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { tenantDelRequest } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Panel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Los colores de la marca son públicos: se aplican también al login, antes de la sesión.
  const tenantDelHost = await tenantDelRequest();
  const conMarca = (contenido: React.ReactNode) => (
    <div
      style={tenantDelHost ? estiloMarca(tenantDelHost.marca) : undefined}
      className="flex flex-1 flex-col"
    >
      {contenido}
    </div>
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: la /admin/login se muestra sola (sin el shell del panel).
  if (!user) return conMarca(children);

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return conMarca(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">Esta cuenta no tiene acceso a este sitio.</p>
        <form action={logout}>
          <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
        </form>
      </main>,
    );
  }

  const enlaces = [
    { href: "/admin", label: "Panel", principal: true },
    { href: "/admin/servicios", label: "Servicios" },
    ...(tenant.modulos.turnos ? [{ href: "/admin/turnos", label: "Turnos" }] : []),
    ...(tenant.modulos.cursos ? [{ href: "/admin/cursos", label: "Cursos" }] : []),
    { href: "/admin/configuracion", label: "Configuración" },
    { href: "/", label: "Ver sitio" },
  ];

  return conMarca(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={
                  e.principal
                    ? "font-medium text-texto hover:text-primario"
                    : "text-texto-suave hover:text-primario"
                }
              >
                {e.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}

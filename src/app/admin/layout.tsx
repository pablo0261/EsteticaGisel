import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Panel" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: la /admin/login se muestra sola (sin el shell del panel).
  if (!user) return <>{children}</>;

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6">
        <p className="font-sans text-ink-soft">Esta cuenta no tiene acceso a este sitio.</p>
        <form action={logout}>
          <button className="font-sans text-sm text-mauve hover:text-mauve-dark">Salir</button>
        </form>
      </main>
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

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-mauve/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={e.principal ? "font-medium text-ink hover:text-mauve" : "text-ink-soft hover:text-mauve"}
              >
                {e.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button className="font-sans text-sm text-mauve hover:text-mauve-dark">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>
  );
}

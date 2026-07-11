import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Panel · Gisel Bigurrarena" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: la /admin/login se muestra sola (sin el shell del panel).
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-mauve/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-6 font-sans text-sm">
            <Link href="/admin" className="font-medium text-ink hover:text-mauve">
              Panel
            </Link>
            <Link href="/admin/servicios" className="text-ink-soft hover:text-mauve">
              Servicios
            </Link>
            <Link href="/admin/turnos" className="text-ink-soft hover:text-mauve">
              Turnos
            </Link>
            <Link href="/admin/cursos" className="text-ink-soft hover:text-mauve">
              Cursos
            </Link>
            <Link
              href="/admin/configuracion"
              className="text-ink-soft hover:text-mauve"
            >
              Configuración
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft hover:text-mauve"
            >
              Ver sitio ↗
            </a>
          </nav>
          <form action={logout}>
            <button className="font-sans text-sm text-mauve hover:text-mauve-dark">
              Salir
            </button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>
  );
}

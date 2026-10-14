import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cerrarSesion } from "@/lib/auth/acciones";
import { masterVerificado } from "@/lib/auth/master";
import { sesionActual } from "@/lib/auth/sesion";
import { COLORES_PLATAFORMA } from "@/lib/plataforma";
import { estiloMarca } from "@/lib/tenant/estilo";

export const metadata = { title: "Panel master" };

const ESTILO = estiloMarca(COLORES_PLATAFORMA);

/** Área master (app.<dominio>, reescrita a /master por el proxy), en español y con la paleta de la plataforma. */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const envolver = (contenido: React.ReactNode) => (
    <div style={ESTILO} className="flex flex-1 flex-col">
      {contenido}
    </div>
  );

  // Pantallas de ingreso: sin el shell (el proxy no deja llegar a otra cosa sin verificar).
  const sesion = await sesionActual();
  if (!sesion?.verificada) return envolver(children);

  const esMaster = await masterVerificado().then(
    () => true,
    () => false,
  );
  if (!esMaster) {
    return envolver(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">Esta cuenta no tiene acceso al panel master.</p>
        <form id="form-salir" action={cerrarSesion}>
          <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
        </form>
      </main>,
    );
  }

  return envolver(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex h-16 items-center justify-between">
          <nav aria-label="Panel master" className="flex items-center gap-6">
            <Link href="/" className="font-serif text-xl text-texto">
              Panel master
            </Link>
            <Link href="/nuevo" className="font-sans text-sm text-texto-suave hover:text-primario">
              Nuevo cliente
            </Link>
          </nav>
          <form id="form-salir" action={cerrarSesion}>
            <button className="font-sans text-sm text-primario hover:text-primario-oscuro">Salir</button>
          </form>
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}

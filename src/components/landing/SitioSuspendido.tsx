import { Container } from "@/components/ui/Container";
import { traducir, type Idioma } from "@/lib/i18n/textos";

/** Sitio de un cliente suspendido. Con panel, el aviso es para quien administra el sitio. */
export function SitioSuspendido({ nombre, idioma, panel = false }: { nombre: string; idioma: Idioma; panel?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">{nombre}</h1>
        <p className="mt-4 font-sans text-texto-suave">
          {traducir(
            idioma,
            panel
              ? {
                  es: "El panel de este sitio está suspendido. Si lo administrás, contactá a la plataforma para reactivarlo.",
                  pt: "O painel deste site está suspenso. Se você o administra, entre em contato com a plataforma para reativá-lo.",
                }
              : {
                  es: "Este sitio no está disponible temporalmente. Volvé a intentar más tarde.",
                  pt: "Este site está temporariamente indisponível. Tente novamente mais tarde.",
                },
          )}
        </p>
      </Container>
    </main>
  );
}

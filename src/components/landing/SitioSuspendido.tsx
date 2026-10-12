import { Container } from "@/components/ui/Container";
import { traducir, type Idioma } from "@/lib/i18n/textos";

export function SitioSuspendido({ nombre, idioma }: { nombre: string; idioma: Idioma }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">{nombre}</h1>
        <p className="mt-4 font-sans text-texto-suave">
          {traducir(idioma, {
            es: "Este sitio no está disponible temporalmente. Volvé a intentar más tarde.",
            pt: "Este site está temporariamente indisponível. Tente novamente mais tarde.",
          })}
        </p>
      </Container>
    </main>
  );
}

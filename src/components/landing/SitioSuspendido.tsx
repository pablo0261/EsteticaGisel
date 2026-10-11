import { Container } from "@/components/ui/Container";

export function SitioSuspendido({ nombre }: { nombre: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-ink">{nombre}</h1>
        <p className="mt-4 font-sans text-ink-soft">
          Este sitio no está disponible temporalmente. Volvé a intentar más tarde.
        </p>
      </Container>
    </main>
  );
}

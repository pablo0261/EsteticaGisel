import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 pt-24 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">Página no encontrada</h1>
        <p className="mt-4 font-sans text-texto-suave">La dirección no existe o ya no está disponible.</p>
        <Button href="/" className="mt-8">
          Volver al inicio
        </Button>
      </Container>
    </main>
  );
}

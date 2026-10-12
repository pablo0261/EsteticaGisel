import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { T } from "@/lib/i18n/cliente";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 pt-24 text-center">
      <Container className="max-w-md">
        <h1 className="font-serif text-4xl text-texto">
          <T es="Página no encontrada" pt="Página não encontrada" />
        </h1>
        <p className="mt-4 font-sans text-texto-suave">
          <T
            es="La dirección no existe o ya no está disponible."
            pt="O endereço não existe ou não está mais disponível."
          />
        </p>
        <Button href="/" className="mt-8">
          <T es="Volver al inicio" pt="Voltar ao início" />
        </Button>
      </Container>
    </main>
  );
}

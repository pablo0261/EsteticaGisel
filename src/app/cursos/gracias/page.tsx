import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Gracias · Gisel Bigurrarena" };

export default function GraciasCursoPage() {
  return (
    <>
      <Nav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 pt-24 pb-16 text-center">
        <Container className="flex flex-col items-center gap-4">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            ¡Listo!
          </p>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">
            Estamos procesando tu pago
          </h1>
          <p className="max-w-md font-sans text-ink-soft">
            En cuanto se confirme te va a llegar un email con el link de acceso
            al curso.
          </p>
          <Button href="/cursos">Ver más cursos</Button>
        </Container>
      </main>
      <Footer />
    </>
  );
}

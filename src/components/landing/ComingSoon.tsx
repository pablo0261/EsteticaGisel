import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/** Página placeholder ("Próximamente") para módulos aún no implementados. */
export function ComingSoon({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <>
      <Nav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 pt-24 pb-16 text-center">
        <Container className="flex flex-col items-center gap-5">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            Próximamente
          </p>
          <h1 className="font-serif text-4xl text-ink sm:text-6xl">{titulo}</h1>
          <p className="max-w-lg font-sans text-ink-soft">{descripcion}</p>
          <Button href="/">Volver al inicio</Button>
        </Container>
      </main>
      <Footer />
    </>
  );
}

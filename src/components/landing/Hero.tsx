import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-cream via-cream to-cream-dark">
      {/* Watermark del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-serif text-[22rem] leading-none text-mauve/10 sm:text-[30rem]"
      >
        GB
      </span>

      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            {SITE.rubro}
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
            Tu momento de{" "}
            <span className="text-mauve">belleza y bienestar</span>
          </h1>
          <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
            Tratamientos faciales, corporales, manos y pies con mirada
            profesional. Reservá tu turno online y sumate a mis cursos de
            estética.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/turnos">Reservar turno</Button>
            <Button href="/cursos" variant="outline">
              Ver cursos
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

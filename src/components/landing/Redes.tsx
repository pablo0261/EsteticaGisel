import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export function Redes() {
  return (
    <Section className="bg-cream-dark">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            Seguime
          </p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
            En Instagram
          </h2>
          <p className="mt-4 font-sans text-ink-soft">
            Mirá mis trabajos, tips de cuidado y novedades de cursos y
            promociones en {SITE.instagramHandle}.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href={SITE.instagram}>Ir a Instagram</Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";

export function SobreMi() {
  return (
    <Section id="sobre-mi" className="bg-cream-dark">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Placeholder de foto (reemplazar por imagen real en public/brand/) */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-mauve-soft to-sage/30">
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-serif text-9xl text-white/40"
            >
              GB
            </span>
          </div>

          <div>
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
              Sobre mí
            </p>
            <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
              Hola, soy Gisel
            </h2>
            <div className="mt-6 space-y-4 font-sans text-ink-soft">
              <p>
                Soy esteticista y me dedico a cuidar la piel y el bienestar de
                cada persona que pasa por mi espacio. Trabajo de forma
                personalizada, con productos de calidad y mucha dedicación.
              </p>
              <p>
                Además de atender en el consultorio, comparto mi experiencia a
                través de cursos de estética, tanto para profesionales del rubro
                como para quienes quieren aprender a cuidarse en casa.
              </p>
              <p className="text-sm italic text-sage">
                (Texto de ejemplo — se reemplaza por la presentación real de
                Gisel.)
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

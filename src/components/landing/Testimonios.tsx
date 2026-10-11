import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";

const TESTIMONIOS = [
  {
    texto:
      "Salí renovada. Gisel es súper profesional y el trato es hermoso. Ya reservé mi próximo turno.",
    nombre: "Carla M.",
  },
  {
    texto:
      "El laminado de cejas me encantó, quedó natural y prolijo. Recomendadísima.",
    nombre: "Sofía R.",
  },
  {
    texto:
      "Hice uno de sus cursos y aprendí un montón. Explica clarísimo y con mucha dedicación.",
    nombre: "Daniela P.",
  },
];

export function Testimonios() {
  return (
    <Section id="testimonios" className="bg-cream">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            Testimonios
          </p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
            Lo que dicen mis clientas
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIOS.map((t) => (
            <figure
              key={t.nombre}
              className="flex flex-col rounded-2xl border border-mauve/15 bg-white/60 p-7"
            >
              <span aria-hidden className="font-serif text-5xl leading-none text-mauve/40">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-sans text-ink-soft">
                {t.texto}
              </blockquote>
              <figcaption className="mt-5 font-sans text-sm font-medium text-sage">
                {t.nombre}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}

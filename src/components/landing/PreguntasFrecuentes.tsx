import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { PreguntaFrecuente } from "@/lib/data/types";
import { traductor, type Idioma } from "@/lib/i18n/textos";

/** Acordeón sin JavaScript (<details>): cada respuesta se separa en párrafos por líneas en blanco. */
export function PreguntasFrecuentes({ preguntas, idioma }: { preguntas: PreguntaFrecuente[]; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section id="preguntas-frecuentes" className="bg-fondo">
      <Container className="max-w-3xl">
        <div className="text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Preguntas frecuentes", pt: "Perguntas frequentes" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "Lo que más me consultan", pt: "O que mais me perguntam" })}
          </h2>
        </div>
        <div className="mt-10 divide-y divide-primario/15 rounded-2xl border border-primario/15 bg-white/60">
          {preguntas.map((p) => (
            <details key={p.id} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-serif text-xl text-texto">
                {p.pregunta}
                <span aria-hidden className="text-primario transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-3 space-y-3 font-sans text-texto-suave">
                {p.respuesta
                  .split(/\n\s*\n/)
                  .map((parrafo) => parrafo.trim())
                  .filter(Boolean)
                  .map((parrafo, i) => (
                    <p key={i}>{parrafo}</p>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

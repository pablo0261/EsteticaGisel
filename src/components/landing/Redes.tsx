import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { traductor, type Idioma } from "@/lib/i18n/textos";

export function Redes({ instagram, idioma }: { instagram: string; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section className="bg-fondo-oscuro">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Seguime", pt: "Me siga" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "En Instagram", pt: "No Instagram" })}
          </h2>
          <p className="mt-4 font-sans text-texto-suave">
            {t({
              es: `Mirá mis trabajos, tips de cuidado y novedades en @${instagram}.`,
              pt: `Veja meus trabalhos, dicas de cuidados e novidades em @${instagram}.`,
            })}
          </p>
          <div className="mt-8 flex justify-center">
            <Button href={`https://instagram.com/${instagram}`}>
              {t({ es: "Ir a Instagram", pt: "Ir para o Instagram" })}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

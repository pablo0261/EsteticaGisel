import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Redes({ instagram }: { instagram: string }) {
  return (
    <Section className="bg-fondo-oscuro">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">Seguime</p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">En Instagram</h2>
          <p className="mt-4 font-sans text-texto-suave">
            Mirá mis trabajos, tips de cuidado y novedades en @{instagram}.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href={`https://instagram.com/${instagram}`}>Ir a Instagram</Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

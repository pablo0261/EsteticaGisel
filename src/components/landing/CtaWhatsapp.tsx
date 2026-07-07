import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/site";

export function CtaWhatsapp() {
  return (
    <section className="bg-mauve">
      <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-serif text-4xl text-cream sm:text-5xl">
          ¿Lista para tu próximo turno?
        </h2>
        <p className="max-w-xl font-sans text-cream/90">
          Escribime por WhatsApp para cualquier consulta, o reservá directamente
          online con seña.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href={whatsappLink()} variant="onDark">
            Escribir por WhatsApp
          </Button>
          <Button
            href="/turnos"
            variant="outline"
            className="border-cream text-cream hover:bg-cream hover:text-mauve"
          >
            Reservar online
          </Button>
        </div>
      </Container>
    </section>
  );
}

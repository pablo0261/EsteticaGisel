import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { whatsappLink } from "@/lib/site";

export const metadata = { title: "Reservar turno · Gisel Bigurrarena" };

export default async function TurnosPage() {
  const servicios = await getServiciosPublicos();

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-24 pb-20">
        <Container className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            Turnos
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
            Reservá tu turno
          </h1>

          {servicios.length === 0 ? (
            <p className="mt-6 font-sans text-ink-soft">
              Todavía no hay servicios cargados para reservar online. Escribinos
              por{" "}
              <a href={whatsappLink()} className="text-mauve underline" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>{" "}
              para coordinar tu turno.
            </p>
          ) : (
            <div className="mt-8">
              <ReservaForm servicios={servicios} />
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

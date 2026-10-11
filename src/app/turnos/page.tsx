import { connection } from "next/server";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { getConfiguracion } from "@/lib/data/configuracion";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { whatsappLink } from "@/lib/site";

export const metadata = { title: "Reservar turno · Gisel Bigurrarena" };

export default async function TurnosPage() {
  // Servicios y disponibilidad cambian: se renderiza en cada request, no en el build.
  await connection();
  const servicios = await getServiciosPublicos();
  const config = await getConfiguracion();
  const senaPorcentaje = config?.sena_porcentaje ?? 50;

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
              <ReservaForm servicios={servicios} senaPorcentaje={senaPorcentaje} />
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

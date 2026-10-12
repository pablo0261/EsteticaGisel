import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

export function CtaWhatsapp({ tenant }: { tenant: Tenant }) {
  const whatsapp = whatsappLink(tenant.marca.whatsapp, "¡Hola! Quería consultar por un turno.");
  const reservaOnline = tenant.modulos.turnos;
  if (!whatsapp && !reservaOnline) return null;

  return (
    <section className="bg-primario">
      <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-serif text-4xl text-fondo sm:text-5xl">
          ¿Lista para tu próximo turno?
        </h2>
        <p className="max-w-xl font-sans text-fondo/90">
          {whatsapp && reservaOnline
            ? "Escribime por WhatsApp para cualquier consulta, o reservá directamente online."
            : whatsapp
              ? "Escribime por WhatsApp y coordinamos tu turno."
              : "Reservá tu turno online en pocos pasos."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsapp && (
            <Button href={whatsapp} variant="onDark">
              Escribir por WhatsApp
            </Button>
          )}
          {reservaOnline && (
            <Button
              href="/turnos"
              variant="outline"
              className="border-fondo text-fondo hover:bg-fondo hover:text-primario"
            >
              Reservar online
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}

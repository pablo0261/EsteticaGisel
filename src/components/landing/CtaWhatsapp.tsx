import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export function CtaWhatsapp({ tenant }: { tenant: Tenant }) {
  const t = traductor(tenant.idioma);
  const whatsapp = whatsappLink(tenant.marca.whatsapp, t(MENSAJES_WHATSAPP.turno));
  const reservaOnline = tenant.modulos.turnos;
  if (!whatsapp && !reservaOnline) return null;

  return (
    <section className="bg-primario">
      <Container className="flex flex-col items-center gap-6 py-16 text-center sm:py-20">
        <h2 className="max-w-2xl font-serif text-4xl text-fondo sm:text-5xl">
          {t({ es: "¿Lista para tu próximo turno?", pt: "Pronta para o seu próximo atendimento?" })}
        </h2>
        <p className="max-w-xl font-sans text-fondo/90">
          {whatsapp && reservaOnline
            ? t({
                es: "Escribime por WhatsApp para cualquier consulta, o reservá directamente online.",
                pt: "Me chame no WhatsApp para qualquer dúvida ou agende direto online.",
              })
            : whatsapp
              ? t({
                  es: "Escribime por WhatsApp y coordinamos tu turno.",
                  pt: "Me chame no WhatsApp e combinamos seu horário.",
                })
              : t({
                  es: "Reservá tu turno online en pocos pasos.",
                  pt: "Agende seu horário online em poucos passos.",
                })}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {whatsapp && (
            <Button href={whatsapp} variant="onDark">
              {t({ es: "Escribir por WhatsApp", pt: "Falar no WhatsApp" })}
            </Button>
          )}
          {reservaOnline && (
            <Button
              href="/turnos"
              variant="outline"
              className="border-fondo text-fondo hover:bg-fondo hover:text-primario"
            >
              {t({ es: "Reservar online", pt: "Agendar online" })}
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}

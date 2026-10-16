import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getTurnoPorToken } from "@/lib/data/turnos";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";

type Props = { params: Promise<{ tenant: string }>; searchParams: Promise<{ turno?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gracias", pt: "Obrigado" });
}

/**
 * Después de reservar. Sin pago anticipado, la reserva vuelve con ?turno=<token de gestión>
 * y el turno ya está confirmado. Con Mercado Pago, el pago se confirma por el webhook.
 */
export default async function GraciasPage({ params, searchParams }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const t = traductor(tenant.idioma);
  const { turno: token } = await searchParams;
  const turno = token && UUID.test(token) ? await getTurnoPorToken(tenant.id, token) : null;

  if (turno?.estado === "confirmado") {
    const fechaHora = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
      dateStyle: "long",
      timeStyle: "short",
      hourCycle: "h23",
      timeZone: tenant.zonaHoraria,
    });
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
        <Container className="flex flex-col items-center gap-4">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "¡Listo!", pt: "Pronto!" })}</p>
          <h1 className="font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "¡Tu turno está confirmado!", pt: "Seu horário está confirmado!" })}
          </h1>
          <p className="max-w-md font-sans text-texto-suave">{`${turno.servicios.nombre} · ${fechaHora}`}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={`/turnos/gestion/${turno.token_gestion}`}>
              {t({ es: "Ver o gestionar mi turno", pt: "Ver ou gerenciar meu agendamento" })}
            </Button>
            <Button href="/" variant="outline">
              {t({ es: "Volver al inicio", pt: "Voltar ao início" })}
            </Button>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "¡Listo!", pt: "Pronto!" })}</p>
        <h1 className="font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Estamos procesando tu pago", pt: "Estamos processando seu pagamento" })}
        </h1>
        <p className="max-w-md font-sans text-texto-suave">
          {t({
            es: "En cuanto se confirme te va a llegar un email con los datos de tu turno. Si no llega en unos minutos, escribinos por WhatsApp.",
            pt: "Assim que for confirmado, você vai receber um e-mail com os dados do seu agendamento. Se não chegar em alguns minutos, fale com a gente pelo WhatsApp.",
          })}
        </p>
        <Button href="/">{t({ es: "Volver al inicio", pt: "Voltar ao início" })}</Button>
      </Container>
    </main>
  );
}

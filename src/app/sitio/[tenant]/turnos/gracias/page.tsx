import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gracias", pt: "Obrigado" });
}

export default async function GraciasPage({ params }: Props) {
  const t = traductor((await tenantDeLaPagina(params)).idioma);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo px-6 pt-24 pb-16 text-center">
      <Container className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "¡Listo!", pt: "Pronto!" })}
        </p>
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

import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { getConfiguracion } from "@/lib/data/configuracion";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { traductor } from "@/lib/i18n/textos";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Reservar turno", pt: "Agendar horário" });
}

export default async function TurnosPage({ params }: Props) {
  // Servicios y disponibilidad cambian: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.turnos) notFound();
  const t = traductor(tenant.idioma);

  const servicios = await getServiciosPublicos(tenant.id);
  const config = await getConfiguracion(tenant.id);
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
  const whatsapp = whatsappLink(tenant.marca.whatsapp, t(MENSAJES_WHATSAPP.turno));

  return (
    <main className="min-h-screen bg-fondo pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
          {t({ es: "Turnos", pt: "Agendamento" })}
        </p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
          {t({ es: "Reservá tu turno", pt: "Agende seu horário" })}
        </h1>

        {servicios.length === 0 ? (
          <p className="mt-6 font-sans text-texto-suave">
            {t({
              es: "Todavía no hay servicios cargados para reservar online.",
              pt: "Ainda não há serviços disponíveis para agendar online.",
            })}
            {whatsapp && (
              <>
                {" "}
                {t({ es: "Escribinos por", pt: "Fale com a gente pelo" })}{" "}
                <a href={whatsapp} className="text-primario underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{" "}
                {t({ es: "para coordinar tu turno.", pt: "para combinar seu horário." })}
              </>
            )}
          </p>
        ) : (
          <div className="mt-8">
            <ReservaForm
              servicios={servicios}
              senaPorcentaje={senaPorcentaje}
              moneda={tenant.moneda}
              pais={tenant.pais}
              zonaHoraria={tenant.zonaHoraria}
            />
          </div>
        )}
      </Container>
    </main>
  );
}

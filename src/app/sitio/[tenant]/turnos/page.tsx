import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { getConfiguracion } from "@/lib/data/configuracion";
import { ReservaForm } from "@/components/turnos/ReservaForm";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { whatsappLink } from "@/lib/tenant/urls";

export const metadata = { title: "Reservar turno" };

export default async function TurnosPage({ params }: { params: Promise<{ tenant: string }> }) {
  // Servicios y disponibilidad cambian: se renderiza en cada request, no en el build.
  await connection();
  const tenant = await tenantDeLaPagina(params);
  if (!tenant.modulos.turnos) notFound();

  const servicios = await getServiciosPublicos(tenant.id);
  const config = await getConfiguracion(tenant.id);
  const senaPorcentaje = config?.sena_porcentaje ?? 50;
  const whatsapp = whatsappLink(tenant.marca.whatsapp, "¡Hola! Quería consultar por un turno.");

  return (
    <main className="min-h-screen bg-fondo pt-24 pb-20">
      <Container className="max-w-2xl">
        <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">Turnos</p>
        <h1 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">Reservá tu turno</h1>

        {servicios.length === 0 ? (
          <p className="mt-6 font-sans text-texto-suave">
            Todavía no hay servicios cargados para reservar online.
            {whatsapp && (
              <>
                {" "}Escribinos por{" "}
                <a href={whatsapp} className="text-primario underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{" "}
                para coordinar tu turno.
              </>
            )}
          </p>
        ) : (
          <div className="mt-8">
            <ReservaForm servicios={servicios} senaPorcentaje={senaPorcentaje} />
          </div>
        )}
      </Container>
    </main>
  );
}

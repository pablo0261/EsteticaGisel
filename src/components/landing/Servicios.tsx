import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { formatPrecio, formatDuracion } from "@/lib/format";
import { getServiciosPublicos } from "@/lib/data/servicios";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Servicios({ tenant }: { tenant: Tenant }) {
  const servicios = await getServiciosPublicos(tenant.id);
  if (servicios.length === 0) return null;
  const reservaOnline = tenant.modulos.turnos;
  const t = traductor(tenant.idioma);

  return (
    <Section id="servicios" className="bg-fondo">
      <Container>
        <div className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
            {t({ es: "Tratamientos", pt: "Tratamentos" })}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
            {t({ es: "Servicios", pt: "Serviços" })}
          </h2>
          <p className="mt-4 font-sans text-texto-suave">
            {t({ es: "Cada servicio tiene su duración y precio.", pt: "Cada serviço tem sua duração e preço." })}
            {reservaOnline &&
              ` ${t({ es: "Reservá online y asegurá tu turno.", pt: "Agende online e garanta seu horário." })}`}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40 hover:shadow-sm"
            >
              <h3 className="font-serif text-2xl text-texto">{s.nombre}</h3>
              <p className="mt-1 font-sans text-sm uppercase tracking-wider text-secundario">
                {formatDuracion(s.duracion_minutos)}
              </p>
              <p className="mt-4 font-sans text-lg text-primario-oscuro">
                {s.precio > 0
                  ? formatPrecio(s.precio, tenant.moneda, tenant.idioma)
                  : t({ es: "Consultar", pt: "Sob consulta" })}
              </p>
              {reservaOnline && (
                <Link
                  href={`/turnos?servicio=${encodeURIComponent(s.nombre)}`}
                  className="mt-6 inline-flex font-sans text-sm font-medium text-primario transition hover:text-primario-oscuro"
                >
                  {t({ es: "Reservar turno →", pt: "Agendar horário →" })}
                </Link>
              )}
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

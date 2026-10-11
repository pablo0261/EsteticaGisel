import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { formatPrecioARS, formatDuracion } from "@/lib/format";
import { getServiciosPublicos } from "@/lib/data/servicios";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Servicios({ tenant }: { tenant: Tenant }) {
  const servicios = await getServiciosPublicos(tenant.id);
  if (servicios.length === 0) return null;
  const reservaOnline = tenant.modulos.turnos;

  return (
    <Section id="servicios" className="bg-cream">
      <Container>
        <div className="max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">Tratamientos</p>
          <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Servicios</h2>
          <p className="mt-4 font-sans text-ink-soft">
            Cada servicio tiene su duración y precio.
            {reservaOnline && " Reservá online y asegurá tu turno."}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-mauve/15 bg-white/60 p-6 transition hover:border-mauve/40 hover:shadow-sm"
            >
              <h3 className="font-serif text-2xl text-ink">{s.nombre}</h3>
              <p className="mt-1 font-sans text-sm uppercase tracking-wider text-sage">
                {formatDuracion(s.duracion_minutos)}
              </p>
              <p className="mt-4 font-sans text-lg text-mauve-dark">
                {s.precio > 0 ? formatPrecioARS(s.precio) : "Consultar"}
              </p>
              {reservaOnline && (
                <Link
                  href={`/turnos?servicio=${encodeURIComponent(s.nombre)}`}
                  className="mt-6 inline-flex font-sans text-sm font-medium text-mauve transition hover:text-mauve-dark"
                >
                  Reservar turno →
                </Link>
              )}
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

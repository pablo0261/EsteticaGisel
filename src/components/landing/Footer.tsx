import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { getConfiguracion } from "@/lib/data/configuracion";
import { resumirHorario } from "@/lib/turnos/horario";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Footer({ tenant }: { tenant: Tenant }) {
  const { marca } = tenant;
  const config = await getConfiguracion(tenant.id);
  const horarios = config ? resumirHorario(config.horario_atencion, tenant.idioma) : [];
  const whatsapp = whatsappLink(marca.whatsapp);

  return (
    <footer id="contacto" className="bg-sage-dark text-cream">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo src={marca.logoClaroUrl ?? marca.logoUrl} alt={tenant.nombre} />
            {marca.tagline && (
              <p className="mt-4 max-w-xs font-sans text-sm text-cream/70">{marca.tagline}.</p>
            )}
          </div>

          {horarios.length > 0 && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
                Horarios
              </h3>
              <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
                {horarios.map((h) => (
                  <li key={h.dias}>
                    <span className="block text-cream/90">{h.dias}</span>
                    {h.horas}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
              Contacto
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
              {whatsapp && (
                <li>
                  <a href={whatsapp} className="transition hover:text-cream" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {marca.emailContacto && (
                <li>
                  <a href={`mailto:${marca.emailContacto}`} className="transition hover:text-cream">
                    {marca.emailContacto}
                  </a>
                </li>
              )}
              {marca.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${marca.instagram}`}
                    className="transition hover:text-cream"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{marca.instagram}
                  </a>
                </li>
              )}
              {marca.direccion && <li>{marca.direccion}</li>}
            </ul>
          </div>

          {tenant.modulos.turnos && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
                Reservas
              </h3>
              {marca.notaReservas && (
                <p className="mt-4 font-sans text-sm text-cream/70">{marca.notaReservas}</p>
              )}
              <Link
                href="/turnos"
                className="mt-4 inline-flex font-sans text-sm font-medium text-cream underline-offset-4 hover:underline"
              >
                Reservar turno →
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6 font-sans text-xs text-cream/50">
          © {tenant.nombre}
          {marca.rubro && ` · ${marca.rubro}`}. Todos los derechos reservados.
        </div>
      </Container>
    </footer>
  );
}

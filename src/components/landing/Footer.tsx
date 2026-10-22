import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { getConfiguracion } from "@/lib/data/configuracion";
import { resumirHorario } from "@/lib/turnos/horario";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { creditoVisible } from "@/lib/sitio/credito";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export async function Footer({ tenant }: { tenant: Tenant }) {
  const { marca } = tenant;
  const t = traductor(tenant.idioma);
  const config = await getConfiguracion(tenant.id);
  const credito = creditoVisible(config?.mostrar_credito === true, tenant.idioma);
  const horarios = config ? resumirHorario(config.horario_atencion, tenant.idioma) : [];
  const whatsapp = whatsappLink(marca.whatsapp, t(MENSAJES_WHATSAPP.consulta));

  return (
    <footer id="contacto" className="bg-secundario-oscuro text-fondo">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo src={marca.logoClaroUrl ?? marca.logoUrl} alt={tenant.nombre} />
            {marca.tagline && (
              <p className="mt-4 max-w-xs font-sans text-sm text-fondo/70">{marca.tagline}.</p>
            )}
          </div>

          {horarios.length > 0 && (
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
                {t({ es: "Horarios", pt: "Horários" })}
              </h3>
              <ul className="mt-4 space-y-2 font-sans text-sm text-fondo/70">
                {horarios.map((h) => (
                  <li key={h.dias}>
                    <span className="block text-fondo/90">{h.dias}</span>
                    {h.horas}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
              {t({ es: "Contacto", pt: "Contato" })}
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-fondo/70">
              {whatsapp && (
                <li>
                  <a href={whatsapp} className="transition hover:text-fondo" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {marca.emailContacto && (
                <li>
                  <a href={`mailto:${marca.emailContacto}`} className="transition hover:text-fondo">
                    {marca.emailContacto}
                  </a>
                </li>
              )}
              {marca.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${marca.instagram}`}
                    className="transition hover:text-fondo"
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
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-fondo/90">
                {t({ es: "Reservas", pt: "Agendamentos" })}
              </h3>
              {marca.notaReservas && (
                <p className="mt-4 font-sans text-sm text-fondo/70">{marca.notaReservas}</p>
              )}
              <Link
                href="/turnos"
                className="mt-4 inline-flex font-sans text-sm font-medium text-fondo underline-offset-4 hover:underline"
              >
                {t({ es: "Reservar turno →", pt: "Agendar horário →" })}
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-fondo/15 pt-6 font-sans text-xs text-fondo/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {tenant.nombre}
            {marca.rubro && ` · ${marca.rubro}`}.{" "}
            {t({ es: "Todos los derechos reservados.", pt: "Todos os direitos reservados." })}
          </p>
          {credito && (
            <a href={credito.href} className="transition hover:text-fondo" target="_blank" rel="noopener noreferrer">
              {credito.texto}
            </a>
          )}
        </div>
      </Container>
    </footer>
  );
}

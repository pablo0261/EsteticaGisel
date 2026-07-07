import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { SITE, whatsappLink } from "@/lib/site";

export function Footer() {
  return (
    <footer id="contacto" className="bg-sage-dark text-cream">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 max-w-xs font-sans text-sm text-cream/70">
              {SITE.tagline}.
            </p>
          </div>

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
              Horarios
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
              {SITE.horarios.map((h) => (
                <li key={h.dias}>
                  <span className="block text-cream/90">{h.dias}</span>
                  {h.horas}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
              Contacto
            </h3>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream/70">
              <li>
                <a href={whatsappLink()} className="transition hover:text-cream" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="transition hover:text-cream">
                  {SITE.email}
                </a>
              </li>
              <li>
                <a href={SITE.instagram} className="transition hover:text-cream" target="_blank" rel="noopener noreferrer">
                  {SITE.instagramHandle}
                </a>
              </li>
              <li>{SITE.zona}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-cream/90">
              Reservas
            </h3>
            <p className="mt-4 font-sans text-sm text-cream/70">
              Llegadas tarde: el turno se realiza únicamente dentro del tiempo
              restante disponible, sin extender el horario.
            </p>
            <Link
              href="/turnos"
              className="mt-4 inline-flex font-sans text-sm font-medium text-cream underline-offset-4 hover:underline"
            >
              Reservar turno →
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6 font-sans text-xs text-cream/50">
          © {SITE.nombre} · {SITE.rubro}. Todos los derechos reservados.
        </div>
      </Container>
    </footer>
  );
}

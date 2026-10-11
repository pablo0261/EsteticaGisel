import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/tenant/urls";
import type { Tenant } from "@/lib/tenant/tipos";

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function Hero({ tenant }: { tenant: Tenant }) {
  const { marca, modulos } = tenant;
  const whatsapp = whatsappLink(marca.whatsapp);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-cream via-cream to-cream-dark">
      {/* Watermark del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-serif text-[22rem] leading-none text-mauve/10 sm:text-[30rem]"
      >
        {iniciales(tenant.nombre)}
      </span>

      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          {marca.rubro && (
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">{marca.rubro}</p>
          )}
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-ink sm:text-7xl">
            {marca.inicioTitulo}
            {marca.inicioDestacado && (
              <>
                {" "}
                <span className="text-mauve">{marca.inicioDestacado}</span>
              </>
            )}
          </h1>
          {marca.inicioTexto && (
            <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
              {marca.inicioTexto}
            </p>
          )}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {modulos.turnos ? (
              <Button href="/turnos">Reservar turno</Button>
            ) : (
              whatsapp && <Button href={whatsapp}>Escribir por WhatsApp</Button>
            )}
            {modulos.cursos && (
              <Button href="/cursos" variant="outline">
                Ver cursos
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

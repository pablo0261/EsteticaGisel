import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { iniciales } from "@/lib/tenant/iniciales";
import { traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

export function Hero({ tenant }: { tenant: Tenant }) {
  const { marca, modulos } = tenant;
  const t = traductor(tenant.idioma);
  const whatsapp = whatsappLink(marca.whatsapp, t(MENSAJES_WHATSAPP.consulta));

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-fondo via-fondo to-fondo-oscuro">
      {/* Watermark del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-serif text-[22rem] leading-none text-primario/10 sm:text-[30rem]"
      >
        {iniciales(tenant.nombre)}
      </span>

      <Container className="relative z-10 py-28">
        <div className="max-w-2xl">
          {marca.rubro && (
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{marca.rubro}</p>
          )}
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-texto sm:text-7xl">
            {marca.inicioTitulo}
            {marca.inicioDestacado && (
              <>
                {" "}
                <span className="text-primario">{marca.inicioDestacado}</span>
              </>
            )}
          </h1>
          {marca.inicioTexto && (
            <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-texto-suave">
              {marca.inicioTexto}
            </p>
          )}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {modulos.turnos ? (
              <Button href="/turnos">{t({ es: "Reservar turno", pt: "Agendar horário" })}</Button>
            ) : (
              whatsapp && (
                <Button href={whatsapp}>
                  {t({ es: "Escribir por WhatsApp", pt: "Falar no WhatsApp" })}
                </Button>
              )
            )}
            {modulos.cursos && (
              <Button href="/cursos" variant="outline">
                {t({ es: "Ver cursos", pt: "Ver cursos" })}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

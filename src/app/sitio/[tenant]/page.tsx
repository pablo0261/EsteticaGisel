import { Hero } from "@/components/landing/Hero";
import { Servicios } from "@/components/landing/Servicios";
import { SobreMi } from "@/components/landing/SobreMi";
import { Testimonios } from "@/components/landing/Testimonios";
import { Redes } from "@/components/landing/Redes";
import { CtaWhatsapp } from "@/components/landing/CtaWhatsapp";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { getTestimonios } from "@/lib/data/testimonios";

export default async function Inicio({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantDeLaPagina(params);
  const { modulos, marca, idioma } = tenant;
  const testimonios = modulos.testimonios ? await getTestimonios(tenant.id) : [];

  return (
    <main>
      <Hero tenant={tenant} />
      <Servicios tenant={tenant} />
      {modulos.sobreMi && <SobreMi nombre={tenant.nombre} marca={marca} idioma={idioma} />}
      {testimonios.length > 0 && <Testimonios testimonios={testimonios} idioma={idioma} />}
      {marca.instagram && <Redes instagram={marca.instagram} idioma={idioma} />}
      <CtaWhatsapp tenant={tenant} />
    </main>
  );
}

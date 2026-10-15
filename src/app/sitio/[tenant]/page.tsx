import { CtaWhatsapp } from "@/components/landing/CtaWhatsapp";
import { Galeria } from "@/components/landing/Galeria";
import { Hero } from "@/components/landing/Hero";
import { PreguntasFrecuentes } from "@/components/landing/PreguntasFrecuentes";
import { Redes } from "@/components/landing/Redes";
import { Servicios } from "@/components/landing/Servicios";
import { SobreMi } from "@/components/landing/SobreMi";
import { Testimonios } from "@/components/landing/Testimonios";
import { getGaleriaPublica } from "@/lib/data/galeria";
import { getPreguntasPublicas } from "@/lib/data/preguntas";
import { getTestimonios } from "@/lib/data/testimonios";
import { tenantDeLaPagina } from "@/lib/tenant/actual";

export default async function Inicio({ params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantDeLaPagina(params);
  const { modulos, marca, idioma } = tenant;
  const [testimonios, imagenes, preguntas] = await Promise.all([
    modulos.testimonios ? getTestimonios(tenant.id) : [],
    modulos.galeria ? getGaleriaPublica(tenant.id) : [],
    modulos.faq ? getPreguntasPublicas(tenant.id) : [],
  ]);

  return (
    <main>
      <Hero tenant={tenant} />
      <Servicios tenant={tenant} />
      {modulos.sobreMi && <SobreMi nombre={tenant.nombre} marca={marca} idioma={idioma} />}
      {testimonios.length > 0 && <Testimonios testimonios={testimonios} idioma={idioma} />}
      {imagenes.length > 0 && <Galeria imagenes={imagenes} nombre={tenant.nombre} idioma={idioma} />}
      {preguntas.length > 0 && <PreguntasFrecuentes preguntas={preguntas} idioma={idioma} />}
      {marca.instagram && <Redes instagram={marca.instagram} idioma={idioma} />}
      <CtaWhatsapp tenant={tenant} />
    </main>
  );
}

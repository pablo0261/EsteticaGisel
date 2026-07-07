import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Servicios } from "@/components/landing/Servicios";
import { SobreMi } from "@/components/landing/SobreMi";
import { Testimonios } from "@/components/landing/Testimonios";
import { Redes } from "@/components/landing/Redes";
import { CtaWhatsapp } from "@/components/landing/CtaWhatsapp";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Servicios />
        <SobreMi />
        <Testimonios />
        <Redes />
        <CtaWhatsapp />
      </main>
      <Footer />
    </>
  );
}

import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { ImagenGaleria } from "@/lib/data/types";
import { traductor, type Idioma } from "@/lib/i18n/textos";

export function Galeria({ imagenes, nombre, idioma }: { imagenes: ImagenGaleria[]; nombre: string; idioma: Idioma }) {
  const t = traductor(idioma);
  return (
    <Section id="galeria" className="bg-fondo-oscuro">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">{t({ es: "Galería", pt: "Galeria" })}</p>
          <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">{t({ es: "Mis trabajos", pt: "Meus trabalhos" })}</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {imagenes.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-2xl bg-fondo">
              <div className="relative aspect-square">
                <Image
                  src={img.imagen_url}
                  alt={img.descripcion ?? nombre}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
              {img.descripcion && (
                <figcaption className="px-4 py-3 font-sans text-sm text-texto-suave">{img.descripcion}</figcaption>
              )}
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}

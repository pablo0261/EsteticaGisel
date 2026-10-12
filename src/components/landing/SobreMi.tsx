import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { traducir, type Idioma } from "@/lib/i18n/textos";
import type { Marca } from "@/lib/tenant/tipos";

export function SobreMi({ nombre, marca, idioma }: { nombre: string; marca: Marca; idioma: Idioma }) {
  const parrafos = (marca.sobreMiTexto ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Section id="sobre-mi" className="bg-fondo-oscuro">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primario-suave to-secundario/30">
            {marca.fotoPerfilUrl && (
              <Image
                src={marca.fotoPerfilUrl}
                alt={nombre}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            )}
          </div>

          <div>
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
              {traducir(idioma, { es: "Sobre mí", pt: "Sobre mim" })}
            </p>
            <h2 className="mt-3 font-serif text-4xl text-texto sm:text-5xl">
              {marca.sobreMiTitulo ?? nombre}
            </h2>
            <div className="mt-6 space-y-4 font-sans text-texto-suave">
              {parrafos.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

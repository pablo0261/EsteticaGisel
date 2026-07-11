import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { getCursosPublicos } from "@/lib/data/cursos";
import { precioEfectivo } from "@/lib/cursos/reglas";
import { formatPrecioARS } from "@/lib/format";

export const metadata = { title: "Cursos · Gisel Bigurrarena" };

export default async function CursosPage() {
  const cursos = await getCursosPublicos();
  const ahora = new Date().toISOString();

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-24 pb-20">
        <Container>
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
            Cursos
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
            Cursos de estética
          </h1>
          <p className="mt-4 max-w-xl font-sans text-ink-soft">
            Contenido en video para profesionales del rubro y para quienes
            quieren aprender a cuidarse en casa.
          </p>

          {cursos.length === 0 ? (
            <p className="mt-8 font-sans text-ink-soft">
              Muy pronto vas a poder comprar y ver mis cursos online desde acá.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((c) => {
                const precio = precioEfectivo({
                  precio: c.precio,
                  precioOferta: c.precio_oferta,
                  ofertaActiva: c.oferta_activa,
                  ofertaDesde: c.oferta_desde,
                  ofertaHasta: c.oferta_hasta,
                  ahoraIso: ahora,
                });
                const enOferta = precio !== c.precio;
                return (
                  <Link
                    key={c.id}
                    href={`/cursos/${c.id}`}
                    className="flex flex-col rounded-2xl border border-mauve/15 bg-white/60 p-6 transition hover:border-mauve/40 hover:shadow-sm"
                  >
                    <p className="font-sans text-xs uppercase tracking-wider text-sage">
                      {c.categoria === "profesional" ? "Profesional" : "Público general"}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl text-ink">{c.titulo}</h2>
                    <p className="mt-3 font-sans text-lg text-mauve-dark">
                      {enOferta && (
                        <span className="mr-2 text-sm text-ink-soft line-through">
                          {formatPrecioARS(c.precio)}
                        </span>
                      )}
                      {formatPrecioARS(precio)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

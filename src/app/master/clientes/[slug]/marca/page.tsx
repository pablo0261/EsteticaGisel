import Image from "next/image";
import { notFound } from "next/navigation";
import { EditorColores } from "@/components/master/EditorColores";
import { AYUDA, BOTON_SECUNDARIO, Mensajes, TARJETA, type ParamsMaster } from "@/components/master/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { esMasterVerificado } from "@/lib/auth/master";
import { subirImagenMarca } from "@/lib/master/acciones";
import { clientePorSlug } from "@/lib/master/servicio";
import { CAMPO_MARCA_IMAGEN, type TipoImagen } from "@/lib/storage/imagenes";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsMaster> };

const IMAGENES: { tipo: TipoImagen; titulo: string; ayuda: string; oscuro: boolean; ancho: number; alto: number }[] = [
  { tipo: "logo", titulo: "Logo", ayuda: "Menú del sitio y emails.", oscuro: false, ancho: 1080, alto: 489 },
  { tipo: "logo_claro", titulo: "Logo claro", ayuda: "Versión para fondos oscuros (pie del sitio).", oscuro: true, ancho: 1080, alto: 489 },
  { tipo: "foto_perfil", titulo: "Foto de perfil", ayuda: "Sección Sobre mí.", oscuro: false, ancho: 800, alto: 1000 },
];

export default async function MarcaCliente({ params, searchParams }: Props) {
  if (!(await esMasterVerificado())) return null;
  const tenant = await clientePorSlug((await params).slug);
  if (!tenant) notFound();
  const m = tenant.marca;
  const query = await searchParams;
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Mensajes params={query} />
        <EditorColores
          slug={tenant.slug}
          avisoGuardado={query.aviso === "contraste_secundario"}
          inicial={{
            colorPrimario: m.colorPrimario,
            colorSecundario: m.colorSecundario,
            colorFondo: m.colorFondo,
            colorTexto: m.colorTexto,
          }}
        />
      </div>
      {IMAGENES.map((img) => {
        const actual = m[CAMPO_MARCA_IMAGEN[img.tipo]];
        return (
          <section key={img.tipo} className={TARJETA}>
            <h2 className="font-serif text-2xl text-texto">{img.titulo}</h2>
            <p className={AYUDA}>{img.ayuda} PNG, JPG o WebP, hasta 2 MB.</p>
            <div
              className={`mt-4 flex h-32 items-center justify-center rounded-xl ${img.oscuro ? "bg-texto" : "bg-fondo"}`}
            >
              {actual ? (
                <Image src={actual} alt={img.titulo} width={img.ancho} height={img.alto} className="h-28 w-auto object-contain" />
              ) : (
                <span className={`font-sans text-sm ${img.oscuro ? "text-fondo" : "text-texto-suave"}`}>Sin imagen</span>
              )}
            </div>
            <form id={`form-imagen-${img.tipo}`} action={subirImagenMarca} className="mt-4 flex flex-wrap items-center gap-3">
              <FormPendingOverlay label="Subiendo…" />
              <input type="hidden" name="slug" value={tenant.slug} />
              <input type="hidden" name="tipo" value={img.tipo} />
              <input
                type="file"
                name="archivo"
                required
                accept="image/png,image/jpeg,image/webp"
                className="font-sans text-sm text-texto-suave"
              />
              <SubmitButton className={BOTON_SECUNDARIO}>Subir</SubmitButton>
            </form>
          </section>
        );
      })}
    </div>
  );
}

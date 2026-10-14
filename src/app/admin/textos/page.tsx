import type { Metadata } from "next";
import { AYUDA, BOTON, CAMPO, ETIQUETA, Mensajes, SUBTITULO, TARJETA, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { traductor } from "@/lib/i18n/textos";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { guardarTextosSitio } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Textos", pt: "Textos" });
}

export default async function TextosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("textos");
  const t = traductor(tenant.idioma);
  const { marca } = tenant;

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{t({ es: "Textos del sitio", pt: "Textos do site" })}</h1>
      <p className={SUBTITULO}>
        {t({
          es: "Colores, logo, foto y datos de contacto los cambia la plataforma: pedíselo si necesitás cambiarlos.",
          pt: "Cores, logo, foto e dados de contato são alterados pela plataforma: peça se precisar mudá-los.",
        })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-textos-sitio" action={guardarTextosSitio} className={`${TARJETA} flex flex-col gap-4`}>
        <h2 className="font-serif text-2xl text-texto">{t({ es: "Inicio", pt: "Página inicial" })}</h2>
        <label className={ETIQUETA}>
          {t({ es: "Título", pt: "Título" })}
          <input name="inicio_titulo" defaultValue={marca.inicioTitulo} required maxLength={L.titulo} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Destacado (va después del título, en el color de la marca)", pt: "Destaque (vem depois do título, na cor da marca)" })}
          <input name="inicio_destacado" defaultValue={marca.inicioDestacado ?? ""} maxLength={L.titulo} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          {t({ es: "Texto", pt: "Texto" })}
          <textarea name="inicio_texto" defaultValue={marca.inicioTexto ?? ""} maxLength={L.texto} rows={4} className={CAMPO} />
        </label>

        {tenant.modulos.sobreMi && (
          <>
            <h2 className="mt-4 font-serif text-2xl text-texto">{t({ es: "Sobre mí", pt: "Sobre mim" })}</h2>
            <label className={ETIQUETA}>
              {t({ es: "Título", pt: "Título" })}
              <input name="sobre_mi_titulo" defaultValue={marca.sobreMiTitulo ?? ""} maxLength={L.titulo} className={CAMPO} />
              <span className={`${AYUDA} block`}>
                {t({ es: "Si lo dejás vacío, se usa el nombre del negocio.", pt: "Se ficar vazio, usa o nome do negócio." })}
              </span>
            </label>
            <label className={ETIQUETA}>
              {t({ es: "Texto", pt: "Texto" })}
              <textarea name="sobre_mi_texto" defaultValue={marca.sobreMiTexto ?? ""} maxLength={L.texto} rows={8} className={CAMPO} />
              <span className={`${AYUDA} block`}>
                {t({ es: "Separá los párrafos con una línea en blanco.", pt: "Separe os parágrafos com uma linha em branco." })}
              </span>
            </label>
          </>
        )}

        <div>
          <SubmitButton className={BOTON}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
      </form>
    </div>
  );
}

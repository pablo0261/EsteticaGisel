import Link from "next/link";
import { Mensajes, SUBTITULO, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { traductor } from "@/lib/i18n/textos";
import { seccionesDelPanel } from "@/lib/panel/secciones";
import { tenantDelAdmin } from "@/lib/tenant/admin";

export default async function PanelInicio({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDelAdmin();
  const t = traductor(tenant.idioma);
  return (
    <div>
      <Mensajes idioma={tenant.idioma} params={await searchParams} />
      {/* Un solo texto (sin <!-- --> en el HTML): lo buscan las pruebas E2E. */}
      <h1 className={TITULO}>{`${t({ es: "Hola", pt: "Olá" })}, ${tenant.nombre}`}</h1>
      <p className={SUBTITULO}>{t({ es: "Gestioná tu sitio desde acá.", pt: "Gerencie seu site por aqui." })}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {seccionesDelPanel(tenant.modulos).map((s) => (
          <Link
            key={s.seccion}
            href={s.ruta}
            className="rounded-2xl border border-primario/15 bg-white/60 p-6 transition hover:border-primario/40"
          >
            <h2 className="font-serif text-2xl text-texto">{t(s.titulo)}</h2>
            <p className="mt-1 font-sans text-sm text-texto-suave">{t(s.descripcion)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

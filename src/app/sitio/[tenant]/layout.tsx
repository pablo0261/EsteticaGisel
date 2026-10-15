import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonWhatsapp } from "@/components/landing/BotonWhatsapp";
import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { contenidoDelSitio } from "@/lib/data/contenido";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { traducir } from "@/lib/i18n/textos";
import { enlacesDelSitio } from "@/lib/sitio/enlaces";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";

type Props = { children: React.ReactNode; params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenantPorSlug((await params).tenant);
  if (!tenant) return {};
  const titulo = tenant.marca.rubro ? `${tenant.nombre} · ${tenant.marca.rubro}` : tenant.nombre;
  return {
    title: { default: titulo, template: `%s · ${tenant.nombre}` },
    description: tenant.marca.tagline ?? undefined,
  };
}

export default async function SitioLayout({ children, params }: Props) {
  const tenant = await getTenantPorSlug((await params).tenant);
  if (!tenant) notFound();
  const activo = tenant.estado === "activo";
  const whatsappUrl = whatsappLink(tenant.marca.whatsapp, traducir(tenant.idioma, MENSAJES_WHATSAPP.consulta));
  // El menú solo enlaza secciones con contenido (y de módulos activos).
  const enlaces = activo ? enlacesDelSitio(tenant.modulos, await contenidoDelSitio(tenant)) : [];

  return (
    <IdiomaProvider idioma={tenant.idioma}>
      {/* Colores de la marca: las clases (bg-primario, text-texto…) leen estas variables. */}
      <div style={estiloMarca(tenant.marca)} className="flex flex-1 flex-col bg-fondo text-texto">
        {!activo ? (
          <SitioSuspendido nombre={tenant.nombre} idioma={tenant.idioma} />
        ) : (
          <>
            <Nav
              nombre={tenant.nombre}
              logoUrl={tenant.marca.logoUrl}
              enlaces={enlaces}
              reservaOnline={tenant.modulos.turnos}
              whatsappUrl={whatsappUrl}
            />
            {children}
            <Footer tenant={tenant} />
            {tenant.modulos.whatsapp && whatsappUrl && <BotonWhatsapp url={whatsappUrl} idioma={tenant.idioma} />}
          </>
        )}
      </div>
    </IdiomaProvider>
  );
}

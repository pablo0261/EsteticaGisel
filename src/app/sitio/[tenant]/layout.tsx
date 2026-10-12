import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { estiloMarca } from "@/lib/tenant/estilo";
import { whatsappLink, MENSAJES_WHATSAPP } from "@/lib/tenant/urls";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { traducir } from "@/lib/i18n/textos";

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

  return (
    <IdiomaProvider idioma={tenant.idioma}>
      {/* Colores de la marca: las clases (bg-primario, text-texto…) leen estas variables. */}
      <div style={estiloMarca(tenant.marca)} className="flex flex-1 flex-col bg-fondo text-texto">
        {tenant.estado === "suspendido" ? (
          <SitioSuspendido nombre={tenant.nombre} idioma={tenant.idioma} />
        ) : (
          <>
            <Nav
              nombre={tenant.nombre}
              logoUrl={tenant.marca.logoUrl}
              modulos={tenant.modulos}
              whatsappUrl={whatsappLink(
                tenant.marca.whatsapp,
                traducir(tenant.idioma, MENSAJES_WHATSAPP.consulta),
              )}
            />
            {children}
            <Footer tenant={tenant} />
          </>
        )}
      </div>
    </IdiomaProvider>
  );
}

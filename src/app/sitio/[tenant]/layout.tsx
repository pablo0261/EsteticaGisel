import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { whatsappLink } from "@/lib/tenant/urls";

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
  if (tenant.estado === "suspendido") return <SitioSuspendido nombre={tenant.nombre} />;

  return (
    <>
      <Nav
        nombre={tenant.nombre}
        logoUrl={tenant.marca.logoUrl}
        modulos={tenant.modulos}
        whatsappUrl={whatsappLink(tenant.marca.whatsapp)}
      />
      {children}
      <Footer tenant={tenant} />
    </>
  );
}

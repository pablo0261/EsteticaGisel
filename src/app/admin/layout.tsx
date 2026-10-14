import type { Metadata } from "next";
import Link from "next/link";
import { SitioSuspendido } from "@/components/landing/SitioSuspendido";
import { Container } from "@/components/ui/Container";
import { cerrarSesion } from "@/lib/auth/acciones";
import { sesionActual } from "@/lib/auth/sesion";
import { IdiomaProvider } from "@/lib/i18n/cliente";
import { IDIOMA_POR_DEFECTO, traductor } from "@/lib/i18n/textos";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { seccionesDelPanel } from "@/lib/panel/secciones";
import { tenantDelHost } from "@/lib/tenant/actual";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { estiloMarca } from "@/lib/tenant/estilo";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // El tenant sale del host (activo o suspendido). Su idioma y sus colores, que son públicos,
  // se aplican también a las pantallas de ingreso, antes de la sesión.
  const tenantHost = await tenantDelHost();
  const idioma = tenantHost?.idioma ?? IDIOMA_POR_DEFECTO;
  const t = traductor(idioma);
  const conMarca = (contenido: React.ReactNode) => (
    <IdiomaProvider idioma={idioma}>
      <div style={tenantHost ? estiloMarca(tenantHost.marca) : undefined} className="flex flex-1 flex-col">
        {contenido}
      </div>
    </IdiomaProvider>
  );

  // Cliente suspendido: ni el ingreso ni el panel, un aviso en su idioma (no la pantalla de error).
  if (tenantHost?.estado === "suspendido") {
    return conMarca(<SitioSuspendido nombre={tenantHost.nombre} idioma={idioma} panel />);
  }

  // Sin la verificación en dos pasos completa, el proxy solo deja llegar a las pantallas
  // de ingreso (login, código, contraseña): se muestran solas, sin el menú del panel.
  const sesion = await sesionActual();
  if (!sesion?.verificada) return conMarca(children);

  const salir = (
    <form id="form-salir" action={cerrarSesion}>
      <button className="font-sans text-sm text-primario hover:text-primario-oscuro">{t({ es: "Salir", pt: "Sair" })}</button>
    </form>
  );

  const tenant = await tenantDelAdmin().catch(() => null);
  if (!tenant) {
    return conMarca(
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fondo px-6">
        <p className="font-sans text-texto-suave">
          {t({ es: "Esta cuenta no tiene acceso a este sitio.", pt: "Esta conta não tem acesso a este site." })}
        </p>
        {salir}
      </main>,
    );
  }

  // Solo las secciones de los módulos habilitados (cada página y action lo vuelve a chequear).
  const enlaces = [
    { href: "/admin", etiqueta: t({ es: "Panel", pt: "Painel" }), principal: true },
    ...seccionesDelPanel(tenant.modulos).map((s) => ({ href: s.ruta, etiqueta: t(s.titulo), principal: false })),
    { href: "/", etiqueta: t({ es: "Ver sitio", pt: "Ver site" }), principal: false },
  ];

  return conMarca(
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-primario/15 bg-white/70">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={e.principal ? "font-medium text-texto hover:text-primario" : "text-texto-suave hover:text-primario"}
              >
                {e.etiqueta}
              </Link>
            ))}
          </nav>
          {salir}
        </Container>
      </header>
      <Container className="py-10">{children}</Container>
    </div>,
  );
}

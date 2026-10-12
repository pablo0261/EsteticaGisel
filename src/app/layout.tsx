import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { getTenantPorSlug } from "@/lib/tenant/actual";
import { CABECERA_TENANT, esSlugValido } from "@/lib/tenant/host";
import { LOCALES } from "@/lib/i18n/textos";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Turnos online",
};

/**
 * Idioma del documento. En el sitio público, el proxy indica el tenant en x-tenant-slug.
 * En el resto (panel, rutas sin tenant) queda "es", el idioma del panel hasta la etapa C.
 * getTenantPorSlug está cacheado por request: el layout del sitio reutiliza la consulta.
 */
async function langDelDocumento(): Promise<string> {
  const slug = (await headers()).get(CABECERA_TENANT);
  if (!slug || !esSlugValido(slug)) return "es";
  const tenant = await getTenantPorSlug(slug).catch(() => null);
  return tenant ? LOCALES[tenant.idioma] : "es";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await langDelDocumento();
  return (
    <html
      lang={lang}
      className={`${cormorant.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

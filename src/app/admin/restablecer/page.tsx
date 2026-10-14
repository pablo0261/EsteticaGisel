import type { Metadata } from "next";
import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Contraseña nueva", pt: "Nova senha" });
}

export default function RestablecerPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="tenant" searchParams={searchParams} />;
}

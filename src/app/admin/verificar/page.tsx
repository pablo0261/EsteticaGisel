import type { Metadata } from "next";
import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Verificación", pt: "Verificação" });
}

export default function VerificarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="tenant" searchParams={searchParams} />;
}

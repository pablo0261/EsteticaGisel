import type { Metadata } from "next";
import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Recuperar contraseña", pt: "Recuperar senha" });
}

export default function RecuperarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="tenant" searchParams={searchParams} />;
}

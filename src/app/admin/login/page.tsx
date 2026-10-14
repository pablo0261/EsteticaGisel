import type { Metadata } from "next";
import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";
import { metadataDelPanel } from "@/lib/panel/metadata";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Ingresar", pt: "Entrar" });
}

export default function LoginPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="tenant" searchParams={searchParams} />;
}

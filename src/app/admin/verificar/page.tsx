import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Verificación · Panel" };

export default function VerificarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="tenant" searchParams={searchParams} />;
}

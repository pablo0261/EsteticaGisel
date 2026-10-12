import { PaginaVerificar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Verificación · Panel master" };

export default function VerificarMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaVerificar tipo="master" searchParams={searchParams} />;
}

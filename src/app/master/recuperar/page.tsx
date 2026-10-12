import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Recuperar contraseña · Panel master" };

export default function RecuperarMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="master" searchParams={searchParams} />;
}

import { PaginaRecuperar, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Recuperar contraseña · Panel" };

export default function RecuperarPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRecuperar tipo="tenant" searchParams={searchParams} />;
}

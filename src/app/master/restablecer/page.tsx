import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Contraseña nueva · Panel master" };

export default function RestablecerMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="master" searchParams={searchParams} />;
}

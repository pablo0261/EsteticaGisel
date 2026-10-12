import { PaginaRestablecer, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Contraseña nueva · Panel" };

export default function RestablecerPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaRestablecer tipo="tenant" searchParams={searchParams} />;
}

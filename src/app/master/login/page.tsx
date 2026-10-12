import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Ingresar · Panel master" };

export default function LoginMasterPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="master" searchParams={searchParams} />;
}

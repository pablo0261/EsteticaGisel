import { PaginaLogin, type ParamsAuth } from "@/components/auth/PaginasAuth";

export const metadata = { title: "Ingresar · Panel" };

export default function LoginPage({ searchParams }: { searchParams: Promise<ParamsAuth> }) {
  return <PaginaLogin tipo="tenant" searchParams={searchParams} />;
}

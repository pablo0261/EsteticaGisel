import { login } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";

export const metadata = { title: "Ingresar · Panel" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6">
      <div className="w-full max-w-sm rounded-2xl border border-primario/15 bg-white/70 p-8">
        <h1 className="font-serif text-3xl text-texto">Panel de gestión</h1>
        <p className="mt-1 font-sans text-sm text-texto-suave">
          Ingresá para administrar tu sitio.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-primario/10 px-3 py-2 font-sans text-sm text-primario-oscuro">
            {error}
          </p>
        )}

        <form action={login} className="mt-6 flex flex-col gap-4">
          <label className="font-sans text-sm text-texto-suave">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario"
            />
          </label>
          <label className="font-sans text-sm text-texto-suave">
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-primario/20 bg-fondo px-3 py-2 text-texto outline-none focus:border-primario"
            />
          </label>
          <SubmitButton className="mt-2 rounded-full bg-primario px-7 py-3 font-sans text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60">
            Ingresar
          </SubmitButton>
          <FormPendingOverlay label="Ingresando…" />
        </form>
      </div>
    </main>
  );
}

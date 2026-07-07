import { login } from "../actions";

export const metadata = { title: "Ingresar · Panel" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm rounded-2xl border border-mauve/15 bg-white/70 p-8">
        <h1 className="font-serif text-3xl text-ink">Panel de gestión</h1>
        <p className="mt-1 font-sans text-sm text-ink-soft">
          Ingresá para administrar tu sitio.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-mauve/10 px-3 py-2 font-sans text-sm text-mauve-dark">
            {error}
          </p>
        )}

        <form action={login} className="mt-6 flex flex-col gap-4">
          <label className="font-sans text-sm text-ink-soft">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink outline-none focus:border-mauve"
            />
          </label>
          <label className="font-sans text-sm text-ink-soft">
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-mauve/20 bg-cream px-3 py-2 text-ink outline-none focus:border-mauve"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-full bg-mauve px-7 py-3 font-sans text-sm font-medium text-cream transition hover:bg-mauve-dark"
          >
            Ingresar
          </button>
        </form>
      </div>
    </main>
  );
}

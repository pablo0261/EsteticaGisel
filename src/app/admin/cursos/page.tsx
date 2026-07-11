import Link from "next/link";
import { getCursosAdmin } from "@/lib/data/cursos";
import { createCurso } from "./actions";
import { formatPrecioARS } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";

export const metadata = { title: "Cursos · Panel" };

export default async function CursosAdmin() {
  const cursos = await getCursosAdmin();

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Cursos</h1>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        Creá el curso con lo básico (el video es opcional acá, podés subirlo
        ahora o después desde la edición). El resto (archivos, oferta) se
        edita después de crearlo.
      </p>

      <form
        action={createCurso}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-mauve/15 bg-white/60 p-4"
      >
        <input
          name="titulo"
          placeholder="Título"
          required
          className="min-w-48 flex-1 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <select
          name="categoria"
          required
          className="rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        >
          <option value="publico_general">Público general</option>
          <option value="profesional">Profesional</option>
        </select>
        <input
          name="precio"
          type="number"
          placeholder="Precio"
          className="w-32 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <input
          name="dias_acceso"
          type="number"
          placeholder="Días de acceso"
          defaultValue={7}
          className="w-36 rounded-lg border border-mauve/20 bg-cream px-3 py-2"
        />
        <label className="flex flex-col font-sans text-xs text-ink-soft">
          Video (opcional)
          <input name="video" type="file" accept="video/*" className="mt-1 text-sm" />
        </label>
        <SubmitButton className="rounded-full bg-mauve px-6 py-2 text-sm font-medium text-cream transition hover:bg-mauve-dark disabled:opacity-60">
          Crear
        </SubmitButton>
        <FormPendingOverlay label="Creando curso…" />
      </form>

      <div className="mt-6 space-y-3">
        {cursos.length === 0 && (
          <p className="font-sans text-sm text-ink-soft">Todavía no hay cursos.</p>
        )}
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={`/admin/cursos/${c.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mauve/15 bg-white/60 p-4 transition hover:border-mauve/40"
          >
            <div>
              <p className="font-serif text-xl text-ink">{c.titulo}</p>
              <p className="font-sans text-xs uppercase tracking-wider text-sage">
                {c.categoria === "profesional" ? "Profesional" : "Público general"} ·{" "}
                {c.estado === "publicado" ? "Publicado" : "Borrador"}
              </p>
            </div>
            <p className="font-sans text-mauve-dark">{formatPrecioARS(c.precio)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

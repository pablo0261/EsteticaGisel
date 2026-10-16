import Link from "next/link";
import { getCursosAdmin } from "@/lib/data/cursos";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { createCurso } from "./actions";
import { formatPrecio } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { InfoHint } from "@/components/ui/InfoHint";

export const metadata = { title: "Cursos · Panel" };

export default async function CursosAdmin() {
  const tenant = await tenantDeSeccion("cursos");
  if (!tenant) return null; // cliente suspendido: el layout muestra el aviso
  const cursos = await getCursosAdmin(tenant.id);

  return (
    <div>
      <h1 className="font-serif text-4xl text-texto">Cursos</h1>
      <p className="mt-2 font-sans text-sm text-texto-suave">
        Creá el curso con lo básico (el video es opcional acá, podés subirlo
        ahora o después desde la edición). El resto (archivos, oferta) se
        edita después de crearlo.
      </p>

      <form
        action={createCurso}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-primario/15 bg-white/60 p-4"
      >
        <input
          name="titulo"
          placeholder="Título"
          required
          className="min-w-48 flex-1 rounded-lg border border-primario/20 bg-fondo px-3 py-2"
        />
        <select
          name="categoria"
          required
          className="rounded-lg border border-primario/20 bg-fondo px-3 py-2"
        >
          <option value="publico_general">Público general</option>
          <option value="profesional">Profesional</option>
        </select>
        <input
          name="precio"
          type="number"
          placeholder="Precio"
          className="w-32 rounded-lg border border-primario/20 bg-fondo px-3 py-2"
        />
        <input
          name="dias_acceso"
          type="number"
          placeholder="Días de acceso"
          defaultValue={7}
          className="w-36 rounded-lg border border-primario/20 bg-fondo px-3 py-2"
        />
        <label className="flex flex-col font-sans text-xs text-texto-suave">
          Video (opcional)
          <input name="video" type="file" accept="video/*" className="mt-1 text-sm" />
        </label>
        <SubmitButton className="rounded-full bg-primario px-6 py-2 text-sm font-medium text-fondo transition hover:bg-primario-oscuro disabled:opacity-60">
          Crear
        </SubmitButton>
        <div className="w-full">
          <InfoHint>
            Subilo en <strong>MP4 (H.264)</strong>, comprimido a 720p si podés —
            es el formato más liviano que se reproduce bien en todos los
            celulares y navegadores. Límite de esta versión de prueba:{" "}
            <strong>150MB por video</strong>. Si necesitás videos más pesados,
            avisame para pasar a otro storage.
          </InfoHint>
        </div>
        <FormPendingOverlay label="Creando curso…" />
      </form>

      <div className="mt-6 space-y-3">
        {cursos.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">Todavía no hay cursos.</p>
        )}
        {cursos.map((c) => (
          <Link
            key={c.id}
            href={`/admin/cursos/${c.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primario/15 bg-white/60 p-4 transition hover:border-primario/40"
          >
            <div>
              <p className="font-serif text-xl text-texto">{c.titulo}</p>
              <p className="font-sans text-xs uppercase tracking-wider text-secundario">
                {c.categoria === "profesional" ? "Profesional" : "Público general"} ·{" "}
                {c.estado === "publicado" ? "Publicado" : "Borrador"}
              </p>
            </div>
            <p className="font-sans text-primario-oscuro">{formatPrecio(c.precio, tenant.moneda, tenant.idioma)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

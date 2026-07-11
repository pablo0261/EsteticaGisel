import { getTurnosAdmin } from "@/lib/data/turnos";
import { cancelarTurnoAdmin, marcarCompletado } from "./actions";
import { formatPrecioARS } from "@/lib/format";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";

export const metadata = { title: "Turnos · Panel" };

const ESTADO_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  completado: "Completado",
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente_pago: "bg-sage/10 text-sage",
  confirmado: "bg-mauve/15 text-mauve-dark",
  cancelado: "bg-ink/5 text-ink-soft",
  completado: "bg-sage/20 text-sage-dark",
};

export default async function TurnosAdmin() {
  const turnos = await getTurnosAdmin();

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Turnos</h1>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        Todos los turnos reservados, más recientes primero.
      </p>

      <div className="mt-6 space-y-3">
        {turnos.length === 0 && (
          <p className="font-sans text-sm text-ink-soft">Todavía no hay turnos.</p>
        )}
        {turnos.map((t) => {
          const fechaHoraTexto = new Date(t.fecha_hora).toLocaleString("es-AR", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "America/Argentina/Buenos_Aires",
          });
          const gestionable = t.estado === "pendiente_pago" || t.estado === "confirmado";
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mauve/15 bg-white/60 p-4"
            >
              <div>
                <p className="font-serif text-lg text-ink">{t.servicios.nombre}</p>
                <p className="font-sans text-sm text-ink-soft">{fechaHoraTexto}</p>
                <p className="font-sans text-sm text-ink-soft">
                  {t.cliente_nombre} · {t.cliente_email}
                  {t.cliente_telefono ? ` · ${t.cliente_telefono}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {t.monto_sena != null && (
                  <span className="font-sans text-sm text-ink-soft">
                    Seña {formatPrecioARS(t.monto_sena)}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${ESTADO_COLOR[t.estado] ?? ""}`}
                >
                  {ESTADO_LABEL[t.estado] ?? t.estado}
                </span>
                {gestionable && (
                  <>
                    {t.estado === "confirmado" && (
                      <form action={marcarCompletado}>
                        <input type="hidden" name="id" value={t.id} />
                        <SubmitButton className="font-sans text-sm text-sage hover:text-sage-dark disabled:opacity-60">
                          Marcar completado
                        </SubmitButton>
                        <FormPendingOverlay label="Guardando…" />
                      </form>
                    )}
                    <form action={cancelarTurnoAdmin}>
                      <input type="hidden" name="id" value={t.id} />
                      <SubmitButton className="font-sans text-sm text-mauve hover:text-mauve-dark disabled:opacity-60">
                        Cancelar
                      </SubmitButton>
                      <FormPendingOverlay label="Cancelando…" />
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

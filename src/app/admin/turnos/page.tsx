import { getTurnosAdmin } from "@/lib/data/turnos";
import { tenantDelAdmin } from "@/lib/tenant/admin";
import { cancelarTurnoAdmin, marcarCompletado } from "./actions";
import { formatPrecio } from "@/lib/format";
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
  pendiente_pago: "bg-secundario/10 text-secundario",
  confirmado: "bg-primario/15 text-primario-oscuro",
  cancelado: "bg-texto/5 text-texto-suave",
  completado: "bg-secundario/20 text-secundario-oscuro",
};

export default async function TurnosAdmin() {
  const tenant = await tenantDelAdmin();
  const turnos = await getTurnosAdmin(tenant.id);

  return (
    <div>
      <h1 className="font-serif text-4xl text-texto">Turnos</h1>
      <p className="mt-2 font-sans text-sm text-texto-suave">
        Todos los turnos reservados, más recientes primero.
      </p>

      <div className="mt-6 space-y-3">
        {turnos.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">Todavía no hay turnos.</p>
        )}
        {turnos.map((t) => {
          const fechaHoraTexto = new Date(t.fecha_hora).toLocaleString("es-AR", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: tenant.zonaHoraria,
          });
          const gestionable = t.estado === "pendiente_pago" || t.estado === "confirmado";
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primario/15 bg-white/60 p-4"
            >
              <div>
                <p className="font-serif text-lg text-texto">{t.servicios.nombre}</p>
                <p className="font-sans text-sm text-texto-suave">{fechaHoraTexto}</p>
                <p className="font-sans text-sm text-texto-suave">
                  {t.cliente_nombre} · {t.cliente_email}
                  {t.cliente_telefono ? ` · ${t.cliente_telefono}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {t.monto_sena != null && (
                  <span className="font-sans text-sm text-texto-suave">
                    Seña {formatPrecio(t.monto_sena, tenant.moneda, tenant.idioma)}
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
                        <SubmitButton className="font-sans text-sm text-secundario hover:text-secundario-oscuro disabled:opacity-60">
                          Marcar completado
                        </SubmitButton>
                        <FormPendingOverlay label="Guardando…" />
                      </form>
                    )}
                    <form action={cancelarTurnoAdmin}>
                      <input type="hidden" name="id" value={t.id} />
                      <SubmitButton className="font-sans text-sm text-primario hover:text-primario-oscuro disabled:opacity-60">
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

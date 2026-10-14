import type { Metadata } from "next";
import { ENLACE, FILA, Mensajes, SUBTITULO, TITULO, type ParamsPanel } from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getTurnosAdmin } from "@/lib/data/turnos";
import type { EstadoTurno } from "@/lib/data/types";
import { formatPrecio } from "@/lib/format";
import { LOCALES, traductor, type Textos } from "@/lib/i18n/textos";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { cancelarTurno, completarTurno } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Turnos", pt: "Agendamentos" });
}

const ESTADOS: Record<EstadoTurno, { etiqueta: Textos; clase: string }> = {
  pendiente_pago: {
    etiqueta: { es: "Pendiente de pago", pt: "Aguardando pagamento" },
    clase: "bg-secundario/10 text-secundario",
  },
  confirmado: { etiqueta: { es: "Confirmado", pt: "Confirmado" }, clase: "bg-primario/15 text-primario-oscuro" },
  cancelado: { etiqueta: { es: "Cancelado", pt: "Cancelado" }, clase: "bg-texto/5 text-texto-suave" },
  completado: { etiqueta: { es: "Completado", pt: "Concluído" }, clase: "bg-secundario/20 text-secundario-oscuro" },
};

export default async function TurnosAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("turnos");
  const t = traductor(tenant.idioma);
  const turnos = await getTurnosAdmin(tenant.id);

  return (
    <div>
      <h1 className={TITULO}>{t({ es: "Turnos", pt: "Agendamentos" })}</h1>
      <p className={SUBTITULO}>{t({ es: "Todos los turnos reservados, más recientes primero.", pt: "Todos os agendamentos, os mais recentes primeiro." })}</p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <div className="space-y-3">
        {turnos.length === 0 && (
          <p className="font-sans text-sm text-texto-suave">{t({ es: "Todavía no hay turnos.", pt: "Ainda não há agendamentos." })}</p>
        )}
        {turnos.map((turno) => {
          const fechaHora = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
            dateStyle: "long",
            timeStyle: "short",
            hourCycle: "h23",
            timeZone: tenant.zonaHoraria,
          });
          const estado = ESTADOS[turno.estado as EstadoTurno];
          const gestionable = turno.estado === "pendiente_pago" || turno.estado === "confirmado";
          return (
            <div key={turno.id} className={`${FILA} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <p className="font-serif text-lg text-texto">{turno.servicios.nombre}</p>
                <p className="font-sans text-sm text-texto-suave">{fechaHora}</p>
                <p className="font-sans text-sm text-texto-suave">
                  {turno.cliente_nombre} · {turno.cliente_email}
                  {turno.cliente_telefono ? ` · ${turno.cliente_telefono}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {turno.monto_sena != null && (
                  <span className="font-sans text-sm text-texto-suave">
                    {`${t({ es: "Cobro online", pt: "Pagamento online" })}: ${formatPrecio(turno.monto_sena, tenant.moneda, tenant.idioma)}`}
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${estado?.clase ?? ""}`}>
                  {estado ? t(estado.etiqueta) : turno.estado}
                </span>
                {gestionable && (
                  <>
                    {turno.estado === "confirmado" && (
                      <form id={`form-completar-${turno.id}`} action={completarTurno}>
                        <input type="hidden" name="id" value={turno.id} />
                        <SubmitButton className="font-sans text-sm text-secundario hover:text-secundario-oscuro disabled:opacity-60">
                          {t({ es: "Marcar completado", pt: "Marcar como concluído" })}
                        </SubmitButton>
                        <FormPendingOverlay label={t({ es: "Guardando…", pt: "Salvando…" })} />
                      </form>
                    )}
                    <form id={`form-cancelar-${turno.id}`} action={cancelarTurno}>
                      <input type="hidden" name="id" value={turno.id} />
                      <SubmitButton className={ENLACE}>{t({ es: "Cancelar", pt: "Cancelar" })}</SubmitButton>
                      <FormPendingOverlay label={t({ es: "Cancelando…", pt: "Cancelando…" })} />
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

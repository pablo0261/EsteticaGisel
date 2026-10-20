import type { Metadata } from "next";
import Link from "next/link";
import {
  AYUDA,
  BOTON,
  CAMPO,
  CAMPO_EN_LINEA,
  CASILLA,
  ETIQUETA,
  FILA,
  Mensajes,
  SUBTITULO,
  TITULO,
  type ParamsPanel,
} from "@/components/panel/ui";
import { FormPendingOverlay } from "@/components/ui/FormPendingOverlay";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getConfiguracion } from "@/lib/data/configuracion";
import { traductor, type Textos } from "@/lib/i18n/textos";
import { cuentaMercadoPago } from "@/lib/integraciones/cuenta";
import { LIMITES_PANEL as L } from "@/lib/panel/limites";
import { seccionHabilitada } from "@/lib/panel/secciones";
import { metadataDelPanel } from "@/lib/panel/metadata";
import { tenantDeSeccion } from "@/lib/panel/servidor";
import { DIAS_SEMANA, nombreDia } from "@/lib/turnos/horario";
import { MODOS_PAGO, NOMBRE_MODO_PAGO, type ModoPago } from "@/lib/turnos/pago";
import { guardarConfiguracion } from "./actions";

export function generateMetadata(): Promise<Metadata> {
  return metadataDelPanel({ es: "Horarios y reglas", pt: "Horários e regras" });
}

const AYUDA_MODO: Record<ModoPago, Textos> = {
  ninguno: {
    es: "El turno queda confirmado al reservar, sin Mercado Pago.",
    pt: "O horário fica confirmado ao agendar, sem Mercado Pago.",
  },
  sena: {
    es: "Se cobra un porcentaje del precio con Mercado Pago; el resto se paga en el turno.",
    pt: "Cobra-se uma porcentagem do valor pelo Mercado Pago; o restante é pago no atendimento.",
  },
  total: {
    es: "Se cobra el precio completo con Mercado Pago al reservar.",
    pt: "Cobra-se o valor total pelo Mercado Pago ao agendar.",
  },
};

export default async function ConfiguracionAdmin({ searchParams }: { searchParams: Promise<ParamsPanel> }) {
  const tenant = await tenantDeSeccion("configuracion");
  if (!tenant) return null; // cliente suspendido: el layout muestra el aviso
  const t = traductor(tenant.idioma);
  const config = await getConfiguracion(tenant.id);

  if (!config) {
    return (
      <p className="font-sans text-texto-suave">
        {t({
          es: "No se pudo leer la configuración. Probá de nuevo en unos minutos.",
          pt: "Não foi possível ler a configuração. Tente novamente em alguns minutos.",
        })}
      </p>
    );
  }

  const conTurnos = seccionHabilitada(tenant.modulos, "turnos");
  const cobraOnline = (await cuentaMercadoPago(tenant.id, tenant.slug)) !== null;
  const numero = (nombre: string, etiqueta: string, valor: number, min: number, max: number) => (
    <label className={ETIQUETA}>
      {etiqueta}
      <input name={nombre} type="number" defaultValue={valor} min={min} max={max} required className={CAMPO} />
    </label>
  );

  return (
    <div className="max-w-2xl">
      <h1 className={TITULO}>{t({ es: "Horarios y reglas", pt: "Horários e regras" })}</h1>
      <p className={SUBTITULO}>
        {conTurnos
          ? t({
              es: "El horario de atención se muestra en el sitio y define los turnos que se pueden reservar.",
              pt: "O horário de atendimento aparece no site e define os horários que podem ser agendados.",
            })
          : t({ es: "El horario de atención se muestra en el pie del sitio.", pt: "O horário de atendimento aparece no rodapé do site." })}
      </p>
      <div className="mt-6">
        <Mensajes idioma={tenant.idioma} params={await searchParams} />
      </div>

      <form id="form-configuracion" action={guardarConfiguracion} className="flex flex-col gap-8">
        <section>
          <h2 className="font-serif text-2xl text-texto">{t({ es: "Horario de atención", pt: "Horário de atendimento" })}</h2>
          <p className={AYUDA}>
            {t({
              es: "Un día sin horas, o marcado como cerrado, no recibe turnos.",
              pt: "Um dia sem horários, ou marcado como fechado, não recebe agendamentos.",
            })}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {DIAS_SEMANA.map((d) => {
              const horario = config.horario_atencion[d.key];
              const dia = nombreDia(d.key, tenant.idioma);
              return (
                <div key={d.key} className={`${FILA} flex flex-wrap items-center gap-3`}>
                  <span className="w-24 font-sans text-sm text-texto">{dia}</span>
                  <input
                    name={`desde_${d.key}`}
                    type="time"
                    defaultValue={horario?.[0] ?? ""}
                    aria-label={`${dia}: ${t({ es: "desde", pt: "das" })}`}
                    className={`${CAMPO_EN_LINEA} text-sm`}
                  />
                  <span className="font-sans text-sm text-texto-suave">{t({ es: "a", pt: "às" })}</span>
                  <input
                    name={`hasta_${d.key}`}
                    type="time"
                    defaultValue={horario?.[1] ?? ""}
                    aria-label={`${dia}: ${t({ es: "hasta", pt: "até" })}`}
                    className={`${CAMPO_EN_LINEA} text-sm`}
                  />
                  <label className={`${CASILLA} ml-auto`}>
                    <input name={`cerrado_${d.key}`} type="checkbox" defaultChecked={!horario} />
                    {t({ es: "Cerrado", pt: "Fechado" })}
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {conTurnos && (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl text-texto">{t({ es: "Reglas de los turnos", pt: "Regras dos agendamentos" })}</h2>
              {numero(
                "horas_minimas_cancelacion",
                t({
                  es: "Horas mínimas para cancelar o reprogramar online",
                  pt: "Horas mínimas para cancelar ou reagendar online",
                }),
                config.horas_minimas_cancelacion,
                0,
                L.horasCancelacionMax,
              )}
              {numero(
                "minutos_preparacion_entre_turnos",
                t({ es: "Minutos de preparación entre turnos", pt: "Minutos de preparação entre atendimentos" }),
                config.minutos_preparacion_entre_turnos,
                0,
                L.minutosEntreTurnosMax,
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl text-texto">{t({ es: "Pago al reservar", pt: "Pagamento ao agendar" })}</h2>
              {!cobraOnline && (
                <p role="status" className="rounded-lg bg-primario/10 px-4 py-3 font-sans text-sm text-primario-oscuro">
                  {t({
                    es: "Todavía no hay Mercado Pago: con “Seña” o “Pago total” la reserva online no se puede completar. Usá “Sin pago anticipado”, o conectalo en ",
                    pt: "Ainda não há Mercado Pago: com “Sinal” ou “Pagamento total” o agendamento online não pode ser concluído. Use “Sem pagamento antecipado”, ou conecte em ",
                  })}
                  <Link href="/admin/conexiones" className="underline">
                    {t({ es: "Conexiones", pt: "Conexões" })}
                  </Link>
                  .
                </p>
              )}
              {MODOS_PAGO.map((modo) => (
                <label key={modo} className={`${FILA} flex items-start gap-3`}>
                  <input
                    type="radio"
                    name="modo_pago"
                    value={modo}
                    defaultChecked={config.modo_pago === modo}
                    required
                    className="mt-1 accent-primario"
                  />
                  <span>
                    <span className="block font-sans text-sm font-medium text-texto">{t(NOMBRE_MODO_PAGO[modo])}</span>
                    <span className={`${AYUDA} block`}>{t(AYUDA_MODO[modo])}</span>
                  </span>
                </label>
              ))}
              {/* parsearConfiguracion exige sena_porcentaje siempre: con otro modo va oculto, con el valor actual. */}
              {config.modo_pago === "sena" ? (
                <>
                  {numero(
                    "sena_porcentaje",
                    t({ es: "Porcentaje de seña (%)", pt: "Porcentagem do sinal (%)" }),
                    config.sena_porcentaje,
                    1,
                    100,
                  )}
                  <p className={AYUDA}>{t({ es: "Se usa solo con “Seña”.", pt: "Usada somente com “Sinal”." })}</p>
                </>
              ) : (
                <>
                  <input type="hidden" name="sena_porcentaje" value={config.sena_porcentaje} />
                  <p className={AYUDA}>
                    {t({
                      es: `Con “Seña” se cobra el ${config.sena_porcentaje}% del precio: elegila y guardá para cambiar el porcentaje.`,
                      pt: `Com “Sinal” cobra-se ${config.sena_porcentaje}% do valor: escolha essa opção e salve para alterar a porcentagem.`,
                    })}
                  </p>
                </>
              )}
            </section>
          </>
        )}

        <div>
          <SubmitButton className={BOTON}>{t({ es: "Guardar", pt: "Salvar" })}</SubmitButton>
        </div>
        <FormPendingOverlay label={t({ es: "Guardando cambios…", pt: "Salvando alterações…" })} />
      </form>
    </div>
  );
}

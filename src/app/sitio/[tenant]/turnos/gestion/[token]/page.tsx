import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { getTurnoPorToken } from "@/lib/data/turnos";
import { getConfiguracion } from "@/lib/data/configuracion";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { GestionPanel } from "@/components/turnos/GestionPanel";
import { tenantDeLaPagina } from "@/lib/tenant/actual";
import { metadataTraducida } from "@/lib/tenant/metadata";
import { LOCALES, traductor } from "@/lib/i18n/textos";
import type { Tenant } from "@/lib/tenant/tipos";

type Props = { params: Promise<{ tenant: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTraducida(params, { es: "Gestionar turno", pt: "Gerenciar agendamento" });
}

export default async function GestionTurnoPage({ params }: Props) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const turno = await getTurnoPorToken(tenant.id, token);
  const t = traductor(tenant.idioma);

  return (
    <main className="min-h-screen bg-fondo px-6 pt-24 pb-20">
      <Container className="max-w-lg">
        {!turno ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "No encontramos ese turno.", pt: "Não encontramos esse agendamento." })}
          </p>
        ) : turno.estado === "cancelado" ? (
          <p className="font-sans text-texto-suave">
            {t({ es: "Este turno ya fue cancelado.", pt: "Este agendamento já foi cancelado." })}
          </p>
        ) : turno.estado !== "confirmado" ? (
          <p className="font-sans text-texto-suave">
            {t({
              es: "Este turno todavía no está confirmado. Si ya hiciste el pago, esperá la confirmación por email.",
              pt: "Este agendamento ainda não está confirmado. Se você já fez o pagamento, aguarde a confirmação por e-mail.",
            })}
          </p>
        ) : (
          <TurnoDetalle tenant={tenant} turno={turno} />
        )}
        <Button href="/" className="mt-8">
          {t({ es: "Volver al inicio", pt: "Voltar ao início" })}
        </Button>
      </Container>
    </main>
  );
}

async function TurnoDetalle({
  tenant,
  turno,
}: {
  tenant: Tenant;
  turno: NonNullable<Awaited<ReturnType<typeof getTurnoPorToken>>>;
}) {
  const config = await getConfiguracion(tenant.id);
  // Qué se cobró al reservar, para el aviso al cancelar (el modo actual dice si fue seña o total).
  const pagoAnticipado =
    turno.monto_sena != null && turno.monto_sena > 0 ? (config?.modo_pago === "total" ? "total" : "sena") : null;
  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });
  const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString(LOCALES[tenant.idioma], {
    dateStyle: "long",
    timeStyle: "short",
    hourCycle: "h23",
    timeZone: tenant.zonaHoraria,
  });
  const t = traductor(tenant.idioma);

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-secundario">
        {t({ es: "Tu turno", pt: "Seu agendamento" })}
      </p>
      <h1 className="mt-3 font-serif text-3xl text-texto sm:text-4xl">
        {turno.servicios.nombre}
      </h1>
      <p className="mt-2 font-sans text-texto-suave">{fechaHoraTexto}</p>

      <div className="mt-6">
        <GestionPanel
          token={turno.token_gestion}
          servicioId={turno.servicio_id}
          permitido={permitido}
          pagoAnticipado={pagoAnticipado}
          zonaHoraria={tenant.zonaHoraria}
        />
      </div>
    </div>
  );
}

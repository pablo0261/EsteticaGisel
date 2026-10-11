import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { getTurnoPorToken } from "@/lib/data/turnos";
import { getConfiguracion } from "@/lib/data/configuracion";
import { puedeCancelar } from "@/lib/turnos/reglas";
import { GestionPanel } from "@/components/turnos/GestionPanel";
import { tenantDeLaPagina } from "@/lib/tenant/actual";

export const metadata = { title: "Gestionar turno" };

export default async function GestionTurnoPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const tenant = await tenantDeLaPagina(params);
  const { token } = await params;
  const turno = await getTurnoPorToken(tenant.id, token);

  return (
    <main className="min-h-screen bg-cream px-6 pt-24 pb-20">
      <Container className="max-w-lg">
        {!turno ? (
          <p className="font-sans text-ink-soft">No encontramos ese turno.</p>
        ) : turno.estado === "cancelado" ? (
          <p className="font-sans text-ink-soft">Este turno ya fue cancelado.</p>
        ) : turno.estado !== "confirmado" ? (
          <p className="font-sans text-ink-soft">
            Este turno todavía no está confirmado. Si ya pagaste la seña, esperá la confirmación por
            email.
          </p>
        ) : (
          <TurnoDetalle tenantId={tenant.id} turno={turno} />
        )}
        <Button href="/" className="mt-8">
          Volver al inicio
        </Button>
      </Container>
    </main>
  );
}

async function TurnoDetalle({
  tenantId,
  turno,
}: {
  tenantId: string;
  turno: NonNullable<Awaited<ReturnType<typeof getTurnoPorToken>>>;
}) {
  const config = await getConfiguracion(tenantId);
  const permitido = puedeCancelar({
    fechaHoraIso: turno.fecha_hora,
    horasMinimas: config?.horas_minimas_cancelacion ?? 24,
    ahoraIso: new Date().toISOString(),
  });
  const fechaHoraTexto = new Date(turno.fecha_hora).toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-sage">
        Tu turno
      </p>
      <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">
        {turno.servicios.nombre}
      </h1>
      <p className="mt-2 font-sans text-ink-soft">{fechaHoraTexto}</p>

      <div className="mt-6">
        <GestionPanel
          token={turno.token_gestion}
          servicioId={turno.servicio_id}
          permitido={permitido}
        />
      </div>
    </div>
  );
}

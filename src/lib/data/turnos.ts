import { datosDelTenant } from "@/lib/tenant/datos";
import { calcularSlots, hhmmToMin, minToHhmm } from "@/lib/turnos/disponibilidad";
import {
  isoFechaHoraAR,
  diaSemanaAR,
  minutosDelDiaAR,
  fechaHoyAR,
  sumarDias,
} from "@/lib/turnos/fechas";
import type { ConfiguracionNegocio, Servicio, Turno } from "./types";

export type SlotDisponible = { hora: string; iso: string };

/**
 * Calcula los horarios disponibles para uno o más servicios en una fecha
 * (YYYY-MM-DD), contra el horario de atención, la duración combinada de los
 * servicios elegidos (se reservan consecutivos, sin hueco entre ellos), el
 * margen de preparación y los turnos ya ocupados (confirmados o pendientes
 * no vencidos).
 */
export async function getDisponibilidad(
  tenantId: string,
  servicioIds: string[],
  fecha: string,
): Promise<SlotDisponible[]> {
  if (servicioIds.length === 0) return [];
  const db = datosDelTenant(tenantId);

  const { data: filasServicios } = await db
    .select("servicios", "duracion_minutos, activo")
    .in("id", servicioIds);
  const servicios = filasServicios as unknown as
    | Pick<Servicio, "duracion_minutos" | "activo">[]
    | null;
  if (
    !servicios ||
    servicios.length !== servicioIds.length ||
    servicios.some((s) => !s.activo)
  ) {
    return [];
  }
  const duracionTotal = servicios.reduce((sum, s) => sum + s.duracion_minutos, 0);

  const { data: filaConfig } = await db
    .select("configuracion_negocio", "horario_atencion, minutos_preparacion_entre_turnos")
    .single();
  const config = filaConfig as unknown as Pick<
    ConfiguracionNegocio,
    "horario_atencion" | "minutos_preparacion_entre_turnos"
  > | null;
  if (!config) return [];

  const horario = (
    config.horario_atencion as Record<string, [string, string]>
  )[diaSemanaAR(fecha)];
  if (!horario) return []; // día cerrado (ej. domingo)

  const { data: filasTurnos } = await db
    .select("turnos", "fecha_hora, duracion_minutos, estado, bloqueado_hasta")
    .gte("fecha_hora", isoFechaHoraAR(fecha, 0))
    .lt("fecha_hora", isoFechaHoraAR(sumarDias(fecha, 1), 0));
  const turnos = filasTurnos as unknown as
    | Pick<Turno, "fecha_hora" | "duracion_minutos" | "estado" | "bloqueado_hasta">[]
    | null;

  const ahora = new Date().toISOString();
  const ocupados = (turnos ?? [])
    .filter(
      (t) =>
        t.estado === "confirmado" ||
        (t.estado === "pendiente_pago" &&
          !!t.bloqueado_hasta &&
          t.bloqueado_hasta > ahora),
    )
    .map((t) => {
      const inicio = minutosDelDiaAR(t.fecha_hora);
      return { inicio, fin: inicio + t.duracion_minutos };
    });

  const desdeMin = fecha === fechaHoyAR() ? minutosDelDiaAR(ahora) : 0;

  const slots = calcularSlots({
    aperturaMin: hhmmToMin(horario[0]),
    cierreMin: hhmmToMin(horario[1]),
    duracionMin: duracionTotal,
    margenMin: config.minutos_preparacion_entre_turnos,
    ocupados,
    stepMin: 30,
    desdeMin,
  });

  return slots.map((m) => ({ hora: minToHhmm(m), iso: isoFechaHoraAR(fecha, m) }));
}

export type TurnoConServicio = {
  id: string;
  servicio_id: string;
  cliente_nombre: string;
  fecha_hora: string;
  duracion_minutos: number;
  estado: string;
  token_gestion: string;
  servicios: { nombre: string };
};

export async function getTurnoPorToken(
  tenantId: string,
  token: string,
): Promise<TurnoConServicio | null> {
  const { data } = await datosDelTenant(tenantId)
    .select(
      "turnos",
      "id, servicio_id, cliente_nombre, fecha_hora, duracion_minutos, estado, token_gestion, servicios(nombre)",
    )
    .eq("token_gestion", token)
    .maybeSingle();
  return (data as unknown as TurnoConServicio) ?? null;
}

export type TurnoAdmin = {
  id: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  fecha_hora: string;
  duracion_minutos: number;
  estado: string;
  monto_sena: number | null;
  google_calendar_event_id: string | null;
  servicios: { nombre: string };
};

/** Turnos del tenant, más recientes primero, para el panel. */
export async function getTurnosAdmin(tenantId: string): Promise<TurnoAdmin[]> {
  const { data, error } = await datosDelTenant(tenantId)
    .select(
      "turnos",
      "id, cliente_nombre, cliente_email, cliente_telefono, fecha_hora, duracion_minutos, estado, monto_sena, google_calendar_event_id, servicios(nombre)",
    )
    .order("fecha_hora", { ascending: false });
  if (error) return [];
  return (data as unknown as TurnoAdmin[]) ?? [];
}

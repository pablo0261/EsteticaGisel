import { createAdminClient } from "@/lib/supabase/admin";
import { calcularSlots, hhmmToMin, minToHhmm } from "@/lib/turnos/disponibilidad";
import {
  isoFechaHoraAR,
  diaSemanaAR,
  minutosDelDiaAR,
  fechaHoyAR,
  sumarDias,
} from "@/lib/turnos/fechas";

export type SlotDisponible = { hora: string; iso: string };

/**
 * Calcula los horarios disponibles para un servicio en una fecha (YYYY-MM-DD),
 * contra el horario de atención, la duración del servicio, el margen de
 * preparación y los turnos ya ocupados (confirmados o pendientes no vencidos).
 */
export async function getDisponibilidad(
  servicioId: string,
  fecha: string,
): Promise<SlotDisponible[]> {
  const db = createAdminClient();

  const { data: servicio } = await db
    .from("servicios")
    .select("duracion_minutos, activo")
    .eq("id", servicioId)
    .single();
  if (!servicio || !servicio.activo) return [];

  const { data: config } = await db
    .from("configuracion_negocio")
    .select("horario_atencion, minutos_preparacion_entre_turnos")
    .eq("id", 1)
    .single();
  if (!config) return [];

  const horario = (
    config.horario_atencion as Record<string, [string, string]>
  )[diaSemanaAR(fecha)];
  if (!horario) return []; // día cerrado (ej. domingo)

  const { data: turnos } = await db
    .from("turnos")
    .select("fecha_hora, duracion_minutos, estado, bloqueado_hasta")
    .gte("fecha_hora", isoFechaHoraAR(fecha, 0))
    .lt("fecha_hora", isoFechaHoraAR(sumarDias(fecha, 1), 0));

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
    duracionMin: servicio.duracion_minutos,
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

export async function getTurnoPorToken(token: string): Promise<TurnoConServicio | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("turnos")
    .select(
      "id, servicio_id, cliente_nombre, fecha_hora, duracion_minutos, estado, token_gestion, servicios(nombre)",
    )
    .eq("token_gestion", token)
    .single();
  return (data as unknown as TurnoConServicio) ?? null;
}

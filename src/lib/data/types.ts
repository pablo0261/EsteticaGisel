export type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
  orden: number;
};

export type ConfiguracionNegocio = {
  id: number;
  horas_minimas_cancelacion: number;
  horas_anticipacion_recordatorio: number;
  minutos_preparacion_entre_turnos: number;
  sena_porcentaje: number;
  horario_atencion: Record<string, [string, string]>;
};

export type EstadoTurno = "pendiente_pago" | "confirmado" | "cancelado" | "completado";

export type Turno = {
  id: string;
  servicio_id: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  fecha_hora: string;
  duracion_minutos: number;
  estado: EstadoTurno;
  monto_sena: number | null;
  google_calendar_event_id: string | null;
  bloqueado_hasta: string | null;
  token_gestion: string;
  recordatorio_enviado: boolean;
};

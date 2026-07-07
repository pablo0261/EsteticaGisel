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

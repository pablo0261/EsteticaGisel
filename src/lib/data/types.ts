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

export type CategoriaCurso = "profesional" | "publico_general";
export type EstadoCurso = "borrador" | "publicado";

export type Curso = {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: CategoriaCurso;
  video_storage_path: string | null;
  permitir_descarga: boolean;
  dias_acceso: number;
  precio: number;
  precio_oferta: number | null;
  oferta_activa: boolean;
  oferta_desde: string | null;
  oferta_hasta: string | null;
  estado: EstadoCurso;
  orden: number;
};

export type ArchivoCurso = {
  id: string;
  curso_id: string;
  nombre_archivo: string;
  storage_path: string;
  tipo: "pdf" | "pptx" | "otro";
};

export type AccesoCurso = {
  id: string;
  curso_id: string;
  cliente_email: string;
  comprado_en: string;
  expira_en: string;
  mp_payment_id: string | null;
};

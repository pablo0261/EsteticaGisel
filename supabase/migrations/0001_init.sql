-- =====================================================================
-- Migración inicial del producto. Tablas del MVP y RLS.
-- Sin datos de ningún salón: eso vive en supabase/seeds/.
-- =====================================================================

-- ---------- servicios ----------
create table servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  duracion_minutos int not null,
  precio numeric(12, 2) not null default 0,
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- ---------- configuracion_negocio (fila única) ----------
create table configuracion_negocio (
  id int primary key default 1,
  horas_minimas_cancelacion int not null default 24,
  horas_anticipacion_recordatorio int not null default 24,
  minutos_preparacion_entre_turnos int not null default 15,
  sena_porcentaje int not null default 50,
  horario_atencion jsonb not null,
  constraint solo_una_fila check (id = 1)
);

-- ---------- turnos ----------
create table turnos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios (id),
  cliente_nombre text not null,
  cliente_email text not null,
  cliente_telefono text,
  fecha_hora timestamptz not null,
  duracion_minutos int not null,
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago', 'confirmado', 'cancelado', 'completado')),
  monto_sena numeric(12, 2),
  google_calendar_event_id text,
  bloqueado_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_turnos_fecha_hora on turnos (fecha_hora);
create index idx_turnos_estado on turnos (estado);

-- ---------- cursos ----------
create table cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  categoria text not null check (categoria in ('profesional', 'publico_general')),
  video_storage_path text,
  permitir_descarga boolean not null default false,
  dias_acceso int not null default 7,
  precio numeric(12, 2) not null default 0,
  precio_oferta numeric(12, 2),
  oferta_activa boolean not null default false,
  oferta_desde timestamptz,
  oferta_hasta timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- ---------- archivos_curso ----------
create table archivos_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos (id) on delete cascade,
  nombre_archivo text not null,
  storage_path text not null,
  tipo text not null check (tipo in ('pdf', 'pptx', 'otro')),
  creado_en timestamptz not null default now()
);

-- ---------- accesos_curso ----------
create table accesos_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos (id),
  cliente_email text not null,
  comprado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  mp_payment_id text,
  creado_en timestamptz not null default now()
);

create index idx_accesos_email on accesos_curso (cliente_email);

-- ---------- pagos (con campos de facturación futura, nullable) ----------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('turno', 'curso')),
  referencia_id uuid not null,
  mp_preference_id text,
  mp_payment_id text,
  estado text not null,
  monto numeric(12, 2) not null,
  factura_tipo text,
  factura_numero text,
  factura_cae text,
  facturado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table servicios enable row level security;
alter table cursos enable row level security;
alter table configuracion_negocio enable row level security;
alter table turnos enable row level security;
alter table archivos_curso enable row level security;
alter table accesos_curso enable row level security;
alter table pagos enable row level security;

-- Lectura pública SOLO de lo público:
create policy "servicios activos son públicos"
  on servicios for select
  using (activo = true);

create policy "cursos publicados son públicos"
  on cursos for select
  using (estado = 'publicado');

-- turnos, accesos_curso, pagos, configuracion_negocio y archivos_curso
-- no tienen policy pública: solo se acceden vía service-role (backend)
-- o vía el admin autenticado (policies posteriores).

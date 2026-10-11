-- Recordatorios de turno a 48h, 24h y 2h, por canal (hoy solo email; whatsapp a futuro).
-- La clave única evita enviar dos veces el mismo recordatorio.
create table recordatorios_enviados (
  turno_id uuid not null references turnos (id) on delete cascade,
  tipo text not null check (tipo in ('48h', '24h', '2h')),
  canal text not null check (canal in ('email', 'whatsapp')),
  enviado_en timestamptz not null default now(),
  primary key (turno_id, tipo, canal)
);

alter table recordatorios_enviados enable row level security;
-- Sin policy pública: solo accesible vía service-role (backend).

-- Reemplazados por la tabla anterior y por los tiempos fijos (48h/24h/2h).
alter table turnos drop column recordatorio_enviado;
alter table configuracion_negocio drop column horas_anticipacion_recordatorio;

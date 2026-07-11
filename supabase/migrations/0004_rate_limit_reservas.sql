-- Registra cada reserva exitosa (por IP) para poder limitar intentos por hora.
create table intentos_reserva (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  creado_en timestamptz not null default now()
);

create index idx_intentos_reserva_ip_fecha on intentos_reserva (ip, creado_en);

alter table intentos_reserva enable row level security;
-- Sin policy pública: solo accesible vía service-role (backend).
